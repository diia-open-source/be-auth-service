import { FilterQuery, ObjectId, UpdateQuery, UpdateWriteOpResult } from 'mongoose'

import { IdentifierService } from '@diia-inhouse/crypto'
import { EventBus, InternalEvent } from '@diia-inhouse/diia-queue'
import { ModelNotFoundError, UnauthorizedError } from '@diia-inhouse/errors'
import { Logger, RefreshToken, SessionType } from '@diia-inhouse/types'

import { GenerateRefreshTokenHelper } from '@src/helpers/generateRefreshToken'

import NotificationService from '@services/notification'
import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'
import TokenCacheService from '@services/tokenCache'
import TokenExpirationService from '@services/tokenExpiration'

import refreshTokenModel from '@models/refreshToken'

import { AppConfig } from '@interfaces/config'
import { AuthMethod } from '@interfaces/models/authSchema'
import { RefreshTokenModel, RefreshToken as RefreshTokenToStore } from '@interfaces/models/refreshToken'
import { ProcessCode } from '@interfaces/services'
import {
    CommonRefreshTokenHeaderParams,
    CreateRefreshTokenHeadersParams,
    RefreshTokenHeadersParams,
    RefreshTokenOps,
    RefreshTokenValidateOps,
} from '@interfaces/services/refreshToken'

export default class RefreshTokenService {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly eventBus: EventBus,

        private readonly tokenCacheService: TokenCacheService,
        private readonly notificationService: NotificationService,
        private readonly photoIdAuthRequestService: PhotoIdAuthRequestService,
        private readonly identifier: IdentifierService,
        private readonly tokenExpirationService: TokenExpirationService,
    ) {}

    private readonly defaultRefreshTokenLifetime: number = this.config.auth.refreshTokenLifetime

    private readonly expirationTimeBySession: Partial<Record<SessionType, number>> = {
        [SessionType.User]: this.config.auth.refreshTokenLifetime,
        [SessionType.CabinetUser]: this.config.auth.cabinetRefreshTokenLifetime,
        [SessionType.EResident]: this.config.auth.refreshTokenLifetime,
        [SessionType.Partner]: this.config.auth.partnerRefreshTokenLifetime,
        [SessionType.Acquirer]: this.config.auth.acquirerRefreshTokenLifetime,
    }

    async create(
        eisTraceId: string,
        sessionType: SessionType,
        ops: RefreshTokenOps = {},
        headers: CreateRefreshTokenHeadersParams = {},
    ): Promise<RefreshToken> {
        const { mobileUid, authEntryPoint, customLifetime, entityId, userIdentifier, login } = ops
        const { platformType, platformVersion, appVersion } = headers

        const token: GenerateRefreshTokenHelper = new GenerateRefreshTokenHelper(
            customLifetime || this.expirationTimeBySession[sessionType] || this.defaultRefreshTokenLifetime,
        )

        const refreshToken: RefreshTokenToStore = {
            ...token,
            eisTraceId,
            sessionType,
            mobileUid,
            entityId,
            userIdentifier,
            login,
            platformType,
            platformVersion,
            appVersion,
            isDeleted: false,
            lastActivityDate: new Date(),
        }

        if (sessionType !== SessionType.User) {
            refreshToken.expirationDate = new Date(refreshToken.expirationTime)
        }

        if (authEntryPoint) {
            refreshToken.authEntryPoint = authEntryPoint
            refreshToken.authEntryPointHistory = [{ authEntryPoint, date: new Date() }]
        }

        await refreshTokenModel.create(refreshToken)

        this.logger.info('Refresh token created')

        return token.asPlain()
    }

    async refresh(
        refreshTokenValue: string,
        sessionType: SessionType,
        ops: RefreshTokenOps = {},
        headers?: RefreshTokenHeadersParams,
    ): Promise<RefreshToken> {
        const token = await this.findByValueAndMobileUid(refreshTokenValue, headers)
        if (token === null) {
            const errorMsg = 'Refresh token not found on refresh'

            this.logger.error(errorMsg, { refreshTokenValue, userIdentifier: ops.userIdentifier })

            throw new UnauthorizedError(errorMsg)
        }

        const { prolongLifetime, authEntryPoint, customLifetime, userIdentifier } = ops

        const newToken: GenerateRefreshTokenHelper = new GenerateRefreshTokenHelper(
            customLifetime || this.expirationTimeBySession[sessionType] || this.defaultRefreshTokenLifetime,
        )

        this.logger.info('Refreshing token')

        token.value = newToken.value
        if (prolongLifetime) {
            token.expirationTime = newToken.expirationTime
            token.expired = undefined
        }

        if (!token.sessionType) {
            token.sessionType = sessionType
        }

        if (!token.userIdentifier) {
            token.userIdentifier = userIdentifier
        }

        if (headers) {
            const { platformType, platformVersion, appVersion } = headers

            token.platformType = platformType
            token.platformVersion = platformVersion
            token.appVersion = appVersion
        }

        if (authEntryPoint) {
            token.authEntryPoint = authEntryPoint
            token.authEntryPointHistory?.push({ authEntryPoint, date: new Date() })
        }

        await token.save()

        return newToken.asPlain()
    }

    async validate(refreshTokenValue: string, headers: { mobileUid: string }, ops: RefreshTokenValidateOps = {}): Promise<void | never> {
        const refreshToken = await this.findByValueAndMobileUid(refreshTokenValue, headers)
        if (!refreshToken) {
            this.logger.error('Refresh token not found', { refreshTokenValue, userIdentifier: ops.userIdentifier })

            throw new UnauthorizedError('Refresh token not found on validate')
        }

        if (refreshToken.expirationTime < Date.now()) {
            const processCode = ops.useProcessCode ? ProcessCode.UserVerificationRequired : undefined

            throw new UnauthorizedError('Refresh token is expired', processCode)
        }
    }

    async invalidateTemporaryToken(refreshTokenValue: string, headers: CommonRefreshTokenHeaderParams): Promise<void> {
        // TODO(BACK-0): check expiration 1 minute
        const refreshToken = await this.findByValueAndMobileUid(refreshTokenValue, headers)
        if (!refreshToken) {
            throw new UnauthorizedError('Refresh token not found on validate temp token')
        }

        if (refreshToken.expired) {
            throw new UnauthorizedError('Refresh token expired')
        }

        refreshToken.expired = true
        await refreshToken.save()
    }

    async isTemporaryTokenInvalidate(mobileUid: string): Promise<boolean> {
        // todo add sessionType: Temporary to query?
        const query: FilterQuery<RefreshTokenModel> = { mobileUid, expired: true, isDeleted: { $ne: true } }
        const count: number = await refreshTokenModel.countDocuments(query)

        return !!count
    }

    async logoutUser(
        refreshToken: RefreshToken,
        mobileUid: string,
        userIdentifier: string,
        sessionType: SessionType,
        tokenExp?: number,
    ): Promise<void> {
        const { value: refreshTokenValue } = refreshToken

        await this.removeRefreshToken(refreshTokenValue, sessionType, mobileUid, userIdentifier)

        await Promise.all([
            this.tokenCacheService.revokeRefreshToken(
                refreshTokenValue,
                this.tokenExpirationService.revocationExpiration(sessionType, tokenExp),
            ),
            this.photoIdAuthRequestService.deleteByMobileUid(mobileUid),
        ])

        const publishResult = await this.eventBus.publish(InternalEvent.AuthUserLogOut, { mobileUid, userIdentifier })
        if (!publishResult) {
            this.logger.fatal(`Failed to publish event [${InternalEvent.AuthUserLogOut}]`)
        }
    }

    async logoutPortalUser(refreshToken: RefreshToken, userIdentifier: string): Promise<void> {
        const { value: refreshTokenValue } = refreshToken

        await this.removeRefreshToken(refreshTokenValue, SessionType.PortalUser, undefined, userIdentifier)
        await this.tokenCacheService.revokeRefreshToken(
            refreshTokenValue,
            this.tokenExpirationService.getTokenExpirationInSecondsBySessionType(SessionType.PortalUser),
        )
    }

    async serviceEntranceLogout(refreshToken: RefreshToken, mobileUid: string, tokenExp?: number): Promise<void> {
        const { value: refreshTokenValue } = refreshToken

        await this.removeRefreshToken(refreshTokenValue, SessionType.ServiceEntrance, mobileUid, undefined)
        await this.tokenCacheService.revokeRefreshToken(
            refreshTokenValue,
            this.tokenExpirationService.revocationExpiration(SessionType.ServiceEntrance, tokenExp),
        )
    }

    async checkRefreshTokensExpiration(): Promise<void> {
        const query: FilterQuery<RefreshTokenModel> = {
            isDeleted: false,
            expired: { $ne: true },
            mobileUid: { $exists: true },
            expirationTime: { $lt: Date.now() },
        }
        const amountToUnassign: number = await refreshTokenModel.countDocuments(query)

        this.logger.info(`Found [${amountToUnassign}] refresh tokens to unassign users from push tokens`)

        if (!amountToUnassign) {
            return this.logger.debug('Refresh tokens to unassign users from push tokens are absent')
        }

        const docsPerIteration = 1000
        const iterations: number = amountToUnassign > docsPerIteration ? Math.ceil(amountToUnassign / docsPerIteration) : 1
        for (let i = 0; i < iterations; i += 1) {
            const tokens = await refreshTokenModel.find(query, { mobileUid: 1, sessionType: 1 }).limit(docsPerIteration)
            if (!tokens.length) {
                this.logger.debug('No more tokens to processing')

                break
            }

            const mobileUidsToUnassignPushTokens: string[] = []
            const expiredIds: ObjectId[] = []

            tokens.forEach(({ _id, sessionType, mobileUid }: RefreshTokenModel) => {
                expiredIds.push(_id)
                if ([SessionType.User, SessionType.EResident, SessionType.EResidentApplicant].includes(sessionType)) {
                    mobileUidsToUnassignPushTokens.push(mobileUid!)
                }
            })

            await Promise.all([
                this.notificationService.unassignUsersFromPushTokens(mobileUidsToUnassignPushTokens),
                this.markAsExpired(expiredIds),
            ])
        }

        this.logger.info(`Successfully unassign users from push tokens [${amountToUnassign}]`)
    }

    async isExists(eisTraceId: string, mobileUid: string): Promise<boolean> {
        const query: FilterQuery<RefreshTokenModel> = { eisTraceId, mobileUid, isDeleted: { $ne: true } }
        const count: number = await refreshTokenModel.countDocuments(query)

        return !!count
    }

    async getTokensByMobileUid(mobileUid: string): Promise<RefreshTokenModel[]> {
        const query: FilterQuery<RefreshTokenModel> = { mobileUid }

        return await refreshTokenModel.find(query)
    }

    async removeTokensByMobileUid(mobileUid: string, userIdentifier?: string, sessionType?: SessionType): Promise<void> {
        const query: FilterQuery<RefreshTokenModel> = { mobileUid }
        if (userIdentifier) {
            query.userIdentifier = userIdentifier
        }

        if (sessionType) {
            query.sessionType = sessionType
        }

        const { deletedCount } = await refreshTokenModel.deleteMany(query)

        this.logger.info(`Removed refresh tokens by mobile uid: ${deletedCount}`, { userIdentifier, sessionType })
    }

    async removeTokensByUserIdentifier(userIdentifier: string, sessionType: SessionType): Promise<void> {
        const query: FilterQuery<RefreshTokenModel> = { userIdentifier, sessionType }

        await this.removeTokens(query)
    }

    async removeTokensByLogin(login: string, sessionType: SessionType): Promise<void> {
        const query: FilterQuery<RefreshTokenModel> = { login, sessionType }

        await this.removeTokens(query)
    }

    async getUserTokensByUserIdentifier(userIdentifier: string): Promise<RefreshTokenModel[]> {
        const sessionType = this.identifier.getSessionTypeFromIdentifier(userIdentifier)

        const query: FilterQuery<RefreshTokenModel> = {
            userIdentifier,
            sessionType,
            authEntryPoint: { $exists: true },
            'authEntryPointHistory.authEntryPoint.target': { $ne: AuthMethod.PhotoId },
            isLoadTestPeriod: { $ne: true },
        }

        return await refreshTokenModel.find(query)
    }

    async getUserTokensByUserIdentifierToDelete(userIdentifier: string): Promise<RefreshTokenModel[]> {
        const sessionType = this.identifier.getSessionTypeFromIdentifier(userIdentifier)
        const query: FilterQuery<RefreshTokenModel> = {
            userIdentifier,
            sessionType,
        }

        return await refreshTokenModel.find(query)
    }

    async countUserTokensByUserIdentifier(userIdentifier: string): Promise<number> {
        const sessionType = this.identifier.getSessionTypeFromIdentifier(userIdentifier)
        const query: FilterQuery<RefreshTokenModel> = {
            userIdentifier,
            sessionType,
        }

        return await refreshTokenModel.countDocuments(query)
    }

    async markAsCompromised(mobileUid: string): Promise<void> {
        const query: FilterQuery<RefreshTokenModel> = { mobileUid }

        await refreshTokenModel.updateMany(query, { isCompromised: true })
    }

    async removeTokensByEntityId(entityId: string): Promise<Pick<RefreshTokenModel, 'value' | 'sessionType'>[]> {
        const query: FilterQuery<RefreshTokenModel> = { entityId }

        const tokens: Pick<RefreshTokenModel, 'value' | 'sessionType'>[] = await refreshTokenModel.find(query, {
            value: 1,
            sessionType: 1,
        })
        const { deletedCount } = await refreshTokenModel.deleteMany(query)

        this.logger.info(`Removed refresh tokens by entity id: ${deletedCount}`)

        return tokens
    }

    async updateActivity(userIdentifier: string, mobileUid: string): Promise<void> {
        const query: FilterQuery<RefreshTokenModel> = { userIdentifier, mobileUid }
        const modifier: UpdateQuery<RefreshTokenModel> = { lastActivityDate: new Date() }

        const { matchedCount } = await refreshTokenModel.updateOne(query, modifier)
        if (matchedCount === 0) {
            throw new ModelNotFoundError(refreshTokenModel.modelName, mobileUid)
        }
    }

    private async findByValueAndMobileUid(value: string, headers?: CommonRefreshTokenHeaderParams): Promise<RefreshTokenModel | null> {
        const query: FilterQuery<RefreshTokenModel> = { value, isDeleted: { $ne: true } }
        if (headers?.mobileUid) {
            query.mobileUid = headers.mobileUid
        }

        return await refreshTokenModel.findOne(query)
    }

    private async removeRefreshToken(
        value: string,
        sessionType: SessionType,
        mobileUid: string | undefined,
        userIdentifier: string | undefined,
    ): Promise<void> {
        this.logger.info('Logging out')
        const prevTokensQuery: FilterQuery<RefreshTokenModel> = { mobileUid, sessionType, userIdentifier, value: { $ne: value } }
        const query: FilterQuery<RefreshTokenModel> = { value, mobileUid }
        const modifier: UpdateQuery<RefreshTokenModel> = { isDeleted: true }

        const [{ modifiedCount }, { deletedCount }]: [UpdateWriteOpResult, { deletedCount?: number }] = await Promise.all([
            refreshTokenModel.updateOne(query, modifier),
            refreshTokenModel.deleteMany(prevTokensQuery),
        ])

        this.logger.info(`Hard deleted refresh tokens: [${deletedCount}]`)
        if (!modifiedCount) {
            this.logger.error("Can't find refresh token by value and mobile uid")

            throw new UnauthorizedError()
        }
    }

    private async markAsExpired(ids: ObjectId[]): Promise<void> {
        await refreshTokenModel.updateMany({ _id: { $in: ids } }, { $set: { expired: true } })
    }

    private async removeTokens(query: FilterQuery<RefreshTokenModel>): Promise<void> {
        const tokens: Pick<RefreshTokenModel, 'value' | 'sessionType'>[] = await refreshTokenModel.find(query, {
            value: 1,
            sessionType: 1,
        })
        const { deletedCount } = await refreshTokenModel.deleteMany(query)

        this.logger.info(`Removed refresh tokens: ${deletedCount}`)

        if (tokens.length) {
            const tasks = tokens.map((token) =>
                this.tokenCacheService.revokeRefreshToken(
                    token.value,
                    this.tokenExpirationService.getTokenExpirationInSecondsBySessionType(token.sessionType),
                ),
            )

            await Promise.all(tasks)
        }
    }
}
