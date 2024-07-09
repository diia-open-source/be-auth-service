import * as bcrypt from 'bcrypt'

import { AuthService, IdentifierService } from '@diia-inhouse/crypto'
import { mongo } from '@diia-inhouse/db'
import { EventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, ErrorType, ModelNotFoundError, ServiceUnavailableError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpStatusCode, Logger, PortalUser, PortalUserTokenData, ServiceUserTokenData, SessionType } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import Utils from '@src/utils'

import BackOfficePetitionService from '@services/backOfficePetition'
import DocumentAcquirersService from '@services/documentAcquirers'
import PartnerService from '@services/partner'
import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'
import RefreshTokenService from '@services/refreshToken'
import TokenCacheService from '@services/tokenCache'
import TokenExpirationService from '@services/tokenExpiration'
import TwoFactorService from '@services/twoFactor'
import UserService from '@services/user'
import VoteService from '@services/vote'

import { InternalEvent } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'
import { RefreshTokenModel } from '@interfaces/models/refreshToken'

export default class AuthTokenService {
    constructor(
        private readonly config: AppConfig,
        private readonly auth: AuthService,
        private readonly logger: Logger,
        private readonly identifier: IdentifierService,
        private readonly eventBus: EventBus,

        private readonly appUtils: Utils,
        private readonly backOfficePetitionService: BackOfficePetitionService,
        private readonly documentAcquirersService: DocumentAcquirersService,
        private readonly partnerService: PartnerService,
        private readonly photoIdAuthRequestService: PhotoIdAuthRequestService,
        private readonly refreshTokenService: RefreshTokenService,
        private readonly tokenCacheService: TokenCacheService,
        private readonly twoFactorService: TwoFactorService,
        private readonly userService: UserService,
        private readonly voteService: VoteService,
        private readonly tokenExpirationService: TokenExpirationService,
    ) {
        this.checkingForValidItnIsEnabled = this.config.authService.checkingForValidItnIsEnabled
        this.testItn = this.config.applicationStoreReview.testItn
    }

    private readonly checkingForValidItnIsEnabled

    private readonly testItn

    async getAcquirerAuthToken(acquirerToken: string, traceId: string): Promise<string> {
        try {
            const [acquirerId, refreshToken] = await Promise.all([
                this.documentAcquirersService.getAcquirerIdByToken(acquirerToken),
                this.refreshTokenService.create(traceId, SessionType.Acquirer),
            ])

            return await this.auth.getJweInJwt({ _id: acquirerId, refreshToken, sessionType: SessionType.Acquirer })
        } catch (err) {
            return utils.handleError(err, (apiError) => {
                if (apiError.getCode() === HttpStatusCode.NOT_FOUND) {
                    throw new UnauthorizedError(`Acquirer not found by the provided token ${acquirerToken}`, undefined, ErrorType.Operated)
                }

                this.logger.error('getAcquirerAuthToken error', { err: apiError })
                throw new ServiceUnavailableError('Failed to get acquirer auth token')
            })
        }
    }

    async getPartnerAcquirerAuthToken(acquirerHashId: string, partnerId: mongo.ObjectId, traceId: string): Promise<string> {
        try {
            const [{ acquirerId }, refreshToken] = await Promise.all([
                this.documentAcquirersService.getAcquirerIdByHashId(acquirerHashId, partnerId),
                this.refreshTokenService.create(traceId, SessionType.Acquirer),
            ])

            return await this.auth.getJweInJwt({ _id: acquirerId, partnerId, refreshToken, sessionType: SessionType.Acquirer })
        } catch {
            throw new UnauthorizedError(`Acquirer not found by the provided id ${acquirerHashId}`)
        }
    }

    async getPartnerAuthToken(partnerToken: string, traceId: string): Promise<string> {
        try {
            const [{ _id: partnerId, scopes }, refreshToken] = await Promise.all([
                this.partnerService.getPartnerByToken(partnerToken),
                this.refreshTokenService.create(traceId, SessionType.Partner),
            ])

            return await this.auth.getJweInJwt({ _id: partnerId.toString(), scopes, refreshToken, sessionType: SessionType.Partner })
        } catch (err) {
            await utils.handleError(err, (error) => {
                if (error.getCode() === HttpStatusCode.NOT_FOUND) {
                    throw new ModelNotFoundError('Partner', partnerToken, {}, undefined, ErrorType.Operated)
                }
            })

            throw err
        }
    }

    async getServiceUserAuthToken(
        loginParam: string,
        password: string | undefined,
        twoFactorCode: string | undefined,
        traceId: string,
    ): Promise<string> {
        const { login, hashedPassword, twoFactorSecret } = await this.userService.getServiceUserByLogin(loginParam)
        if (twoFactorCode) {
            await this.twoFactorService.verifyServiceUserCode(twoFactorSecret!, twoFactorCode)
        }

        if (password) {
            const isPasswordValid = await bcrypt.compare(password, hashedPassword!)

            if (!isPasswordValid) {
                throw new AccessDeniedError('Password is not valid')
            }
        }

        await this.refreshTokenService.removeTokensByLogin(login, SessionType.ServiceUser)

        const customLifetime = 2_592_000_000
        const refreshToken = await this.refreshTokenService.create(traceId, SessionType.ServiceUser, { customLifetime })

        const session: ServiceUserTokenData = { login, sessionType: SessionType.ServiceUser, refreshToken }

        return await this.auth.getJweInJwt(session)
    }

    async getPortalUserToken(portalUser: PortalUser, traceId: string): Promise<string> {
        const user: PortalUser = { ...portalUser, birthDay: this.appUtils.normalizeBirthDay(portalUser.birthDay) }

        const identifier = this.identifier.createIdentifier(user.itn)
        const sessionType = SessionType.PortalUser

        this.logger.info('Start receiving token for portal user', { identifier, traceId })

        await this.refreshTokenService.removeTokensByUserIdentifier(identifier, SessionType.PortalUser)

        const [refreshToken, permissions] = await Promise.all([
            this.refreshTokenService.create(traceId, sessionType, { userIdentifier: identifier }),
            this.backOfficePetitionService.getPortalUserPermissions(identifier),
        ])

        const tokenData: PortalUserTokenData = {
            ...user,
            identifier,
            refreshToken,
            sessionType,
            permissions,
        }
        const token = await this.auth.getJweInJwt(tokenData)

        await this.voteService.joinUserToPetitions(tokenData)

        return token
    }

    async deleteEntitiesByOfferRequestHashId(hashId: string): Promise<void> {
        const tokens = await this.refreshTokenService.removeTokensByEntityId(hashId)

        const tasks = tokens.map((token) =>
            this.tokenCacheService.revokeRefreshToken(
                token.value,
                this.tokenExpirationService.getTokenExpirationInSecondsBySessionType(token.sessionType),
            ),
        )

        try {
            await Promise.all(tasks)
        } catch (err) {
            this.logger.fatal('Failed to process task on clear user session data', { err })
        }
    }

    async clearUserSessionData(userIdentifier: string, mobileUid: string, skipLogoutEvent = false): Promise<void> {
        const refreshTokens = await this.refreshTokenService.getTokensByMobileUid(mobileUid)

        const tasks: unknown[] = refreshTokens.map(({ value, sessionType }: RefreshTokenModel) =>
            this.tokenCacheService.revokeRefreshToken(
                value,
                this.tokenExpirationService.getTokenExpirationInSecondsBySessionType(sessionType),
            ),
        )

        tasks.push(
            this.photoIdAuthRequestService.deleteByMobileUid(mobileUid),
            this.refreshTokenService.removeTokensByMobileUid(mobileUid, userIdentifier),
            !skipLogoutEvent && this.eventBus.publish(InternalEvent.AuthUserLogOut, { mobileUid, userIdentifier }),
        )

        try {
            await Promise.all(tasks)
        } catch (err) {
            this.logger.fatal('Failed to process task on clear user session data', { err })
        }
    }

    checkForValidItn(itn: string): void | never {
        if (!this.checkingForValidItnIsEnabled) {
            return
        }

        if (itn === this.testItn) {
            return
        }

        if (itn === '0000000000') {
            this.logger.error('Itn consists of zeros')

            throw new UnauthorizedError()
        }

        const isValidItn = utils.isItnChecksumValid(itn)
        if (!isValidItn) {
            this.logger.error('Itn is not valid', { rawItn: itn })

            throw new UnauthorizedError()
        }
    }
}
