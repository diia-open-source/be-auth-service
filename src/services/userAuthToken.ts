import { cloneDeep, merge, set } from 'lodash'

import { AnalyticsActionResult } from '@diia-inhouse/analytics'
import { AuthService as AuthCryptoService, IdentifierOps, IdentifierService } from '@diia-inhouse/crypto'
import { AccessDeniedError, BadRequestError, UnauthorizedError } from '@diia-inhouse/errors'
import {
    AuthEntryPoint,
    EResidentApplicant,
    IdentifierPrefix,
    Logger,
    RefreshToken,
    ServiceEntranceTokenData,
    ServiceUserTokenData,
    SessionType,
    User,
    UserActionHeaders,
    UserTokenData,
} from '@diia-inhouse/types'
import { asserts, utils } from '@diia-inhouse/utils'

import Utils from '@src/utils'

import AuthService from '@services/auth'
import AuthTokenService from '@services/authToken'
import BankIdAuthRequestService from '@services/bankIdAuthRequest'
import CustomRefreshTokenExpirationService from '@services/customRefreshTokenExpiration'
import DocumentAcquirersService from '@services/documentAcquirers'
import EisVerifierService from '@services/eisVerifier'
import EResidentFirstAuthService from '@services/eResidentFirstAuth'
import NfcService from '@services/nfc'
import NotificationService from '@services/notification'
import RefreshTokenService from '@services/refreshToken'
import SessionService from '@services/session'
import TokenCacheService from '@services/tokenCache'
import TokenExpirationService from '@services/tokenExpiration'
import UserService from '@services/user'
import UserAuthStepsAuthDataService from '@services/userAuthSteps/authData'

import UserDataMapper from '@dataMappers/userDataMapper'

import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { AuthMethodVerifyResult } from '@interfaces/services/authMethods'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { GetServiceEntranceDataByOtpResult } from '@interfaces/services/documentAcquirers'
import { MessageTemplateCode } from '@interfaces/services/notification'
import { RefreshTokenOps } from '@interfaces/services/refreshToken'
import { Session } from '@interfaces/services/session'
import {
    AuthUser,
    AuthUserSessionType,
    ExtractBirthdayResult,
    GenerateTokenResult,
    GetTokenHandlers,
    GetTokenParams,
    PrepareUserDataParams,
    UserAuthTokenHeadersParams,
    ValidateParams,
} from '@interfaces/services/userAuthToken'

export default class UserAuthTokenService {
    constructor(
        private readonly logger: Logger,
        private readonly identifier: IdentifierService,
        private readonly auth: AuthCryptoService,

        private readonly config: AppConfig,
        private readonly appUtils: Utils,
        private readonly authTokenService: AuthTokenService,
        private readonly eResidentFirstAuthService: EResidentFirstAuthService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly notificationService: NotificationService,
        private readonly refreshTokenService: RefreshTokenService,
        private readonly customRefreshTokenExpirationService: CustomRefreshTokenExpirationService,
        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
        private readonly tokenCacheService: TokenCacheService,
        private readonly nfcService: NfcService,
        private readonly documentAcquirersService: DocumentAcquirersService,
        private readonly bankIdAuthRequestService: BankIdAuthRequestService,
        private readonly eisVerifierService: EisVerifierService,
        private readonly tokenExpirationService: TokenExpirationService,

        private readonly userDataMapper: UserDataMapper,
    ) {}

    private customCoreAuthService: AuthCryptoService | undefined

    private readonly identifierOptionsBySessionType: Partial<Record<SessionType, IdentifierOps>> = {
        [SessionType.CabinetUser]: {},
        [SessionType.User]: {},
        [SessionType.EResident]: { prefix: IdentifierPrefix.EResident },
        [SessionType.EResidentApplicant]: {},
    }

    private readonly messageTemplateCodeBySessionType: Partial<Record<SessionType, MessageTemplateCode>> = {
        [SessionType.User]: MessageTemplateCode.NewDeviceConnecting,
        [SessionType.CabinetUser]: MessageTemplateCode.NewDeviceConnecting,
        [SessionType.EResident]: MessageTemplateCode.EResidentNewDeviceConnecting,
        [SessionType.EResidentApplicant]: MessageTemplateCode.EResidentNewDeviceConnecting,
    }

    private readonly sessionTypeToGetTokenHandlers: GetTokenHandlers = {
        [SessionType.User]: this.getUserToken.bind(this),
        [SessionType.CabinetUser]: this.getUserToken.bind(this),
        [SessionType.EResident]: this.getUserToken.bind(this),
        [SessionType.EResidentApplicant]: this.getEResidentApplicantToken.bind(this),
    }

    private readonly eResidentRegistry = this.config.eResident.registryIsEnabled

    async getToken(params: GetTokenParams): Promise<GenerateTokenResult> {
        const { requestId, method, headers, sessionType } = params

        this.logger.info('Start receiving token with a specific provider', { requestId, provider: method, ...headers })

        if (!this.sessionTypeToGetTokenHandlers[sessionType]) {
            throw new AccessDeniedError(`Unsupported application user session type: ${sessionType}`)
        }

        return await this.sessionTypeToGetTokenHandlers[sessionType](params)
    }

    async getUserToken(params: GetTokenParams): Promise<GenerateTokenResult> {
        const { headers, method, requestId, bankId, user: userParam, sessionType } = params
        const { mobileUid } = headers

        const user: User = userParam || (await this.prepareUserData({ method, requestId, headers, bankId }))

        if (sessionType === SessionType.EResident) {
            await this.validateFlow({
                method,
                requestId,
                mobileUid,
                bankId,
            })
        }

        const identifierOptions = this.identifierOptionsBySessionType[sessionType]

        const userIdentifier: string = this.identifier.createIdentifier(user.itn, identifierOptions)

        await this.authTokenService.clearUserSessionData(userIdentifier, mobileUid)

        const authEntryPoint: AuthEntryPoint = this.appUtils.getAuthEntryPoint(method, user.document, bankId)

        const { token, identifier, tokenData }: GenerateTokenResult = await this.generateUserToken(
            user,
            headers,
            authEntryPoint,
            userIdentifier,
            sessionType,
        )

        this.sendSuccessTokenGenerationAnalytics(params, identifier)

        await this.sendAuthNotification(tokenData, mobileUid, this.messageTemplateCodeBySessionType[sessionType])

        if (this.eResidentRegistry && method === AuthMethod.EResidentQrCode) {
            await this.eResidentFirstAuthService.confirmAuth(user.itn, mobileUid)
        }

        return { token, identifier, tokenData }
    }

    async getEResidentApplicantToken(params: GetTokenParams<EResidentApplicant>): Promise<GenerateTokenResult> {
        const { headers, method, user } = params
        const { mobileUid } = headers
        if (!user) {
            throw new AccessDeniedError('Applicant data must be specified')
        }

        const userIdentifier = this.identifier.createIdentifier(user.email, { prefix: IdentifierPrefix.EResidentApplicant })

        await this.authTokenService.clearUserSessionData(userIdentifier, mobileUid)

        const authEntryPoint: AuthEntryPoint = this.appUtils.getAuthEntryPoint(method, user.document)

        const { token, identifier, tokenData }: GenerateTokenResult = await this.generateEResidentApplicantToken(
            user,
            headers,
            authEntryPoint,
            userIdentifier,
        )

        await this.sendSuccessTokenGenerationAnalytics<EResidentApplicant>(params, identifier)

        await this.sendAuthNotification(tokenData, mobileUid, this.messageTemplateCodeBySessionType[SessionType.EResidentApplicant])

        return { token, identifier, tokenData }
    }

    async prepareUserData(params: PrepareUserDataParams): Promise<User> {
        const { method, requestId, headers, bankId, qrCodePayload, qesPayload, mrzPayload } = params
        const { mobileUid } = headers

        await this.validateFlow({ method, requestId, mobileUid, bankId })

        const userData = await this.authService.verify(method, requestId, {
            headers,
            bankId,
            qrCodePayload,
            qesPayload,
            mrzPayload,
        })

        if (method === AuthMethod.PhotoId) {
            return <User>(<unknown>undefined)
        }

        const mappedUser = await this.mapAndVerifyUserData(method, requestId, userData)

        return mappedUser
    }

    async sendAuthNotification(
        tokenData: AuthUser,
        mobileUid: string,
        templateCode: MessageTemplateCode = MessageTemplateCode.NewDeviceConnecting,
    ): Promise<void> {
        const sessionId: string = this.identifier.createIdentifier(mobileUid)
        const { identifier: userIdentifier } = tokenData
        try {
            const sessions: Session[] = await this.sessionService.getSessions(userIdentifier)
            const activeSessions: number = sessions.filter((session) => session.status).length
            if (activeSessions > 1) {
                await this.notificationService.createNotificationWithPushes(userIdentifier, templateCode, sessionId, [mobileUid])
            }
        } catch (err) {
            this.logger.fatal('Failed to create notification with pushes', { err })
        }
    }

    async getNfcUserToken(headers: UserActionHeaders): Promise<GenerateTokenResult> {
        const { mobileUid } = headers

        if (!(await this.refreshTokenService.isTemporaryTokenInvalidate(mobileUid))) {
            throw new BadRequestError('Invalid nfc flow')
        }

        this.logger.info('Start receiving nfc token')
        const method = AuthMethod.Nfc
        const userData = <NfcUserDTO>await this.authService.verify(method, '', { headers })
        const user = this.userDataMapper.fromNfcToEntity(userData)
        const userIdentifier = this.identifier.createIdentifier(user.itn)

        await this.authTokenService.clearUserSessionData(userIdentifier, mobileUid)

        const authEntryPoint: AuthEntryPoint = this.appUtils.getAuthEntryPoint(AuthMethod.Nfc, user.document)

        const result: GenerateTokenResult = await this.generateUserToken(user, headers, authEntryPoint, userIdentifier, SessionType.User)

        await this.sendAuthNotification(result.tokenData, mobileUid)

        return result
    }

    async prolongSession(
        prevUserData: UserTokenData,
        headers: UserActionHeaders,
        processId: string,
        sessionType: AuthUserSessionType,
        tokenExp?: number,
    ): Promise<string> {
        const { mobileUid, platformType, appVersion } = headers
        const data = await this.userAuthStepsAuthDataService.getAuthorizationCacheData(AuthSchemaCode.Prolong, processId)
        const { user, method, bankId } = data

        this.assertUserIsValid(user)
        asserts.isRefreshTokenExists(prevUserData)

        const prevRefreshToken = prevUserData.refreshToken

        const { itn, document } = user

        const { birthDay } = this.extractBirthday(user)
        const authEntryPoint: AuthEntryPoint = this.appUtils.getAuthEntryPoint(method, document, bankId)
        const tokenData = {
            ...user,
            sessionType,
            identifier: this.identifier.createIdentifier(itn),
            mobileUid,
            birthDay,
            authEntryPoint,
            refreshToken: null,
        }
        const customLifetime = await this.customRefreshTokenExpirationService.getByPlatformTypeAndAppVersion(platformType, appVersion)

        return await this.refreshUserToken(
            tokenData,
            prevRefreshToken,
            headers,
            {
                prolongLifetime: true,
                authEntryPoint,
                customLifetime,
            },
            tokenExp,
        )
    }

    async refreshUserToken(
        user: AuthUser,
        refreshToken: RefreshToken,
        headers: UserAuthTokenHeadersParams,
        ops?: RefreshTokenOps,
        tokenExp?: number,
    ): Promise<string> {
        const { identifier: userIdentifier, sessionType } = user
        const { value: refreshTokenValue } = refreshToken

        this.logger.info('Refreshing token', { userIdentifier, sessionType })
        const newRefreshToken = await this.refreshTokenService.refresh(refreshTokenValue, sessionType, { ...ops, userIdentifier }, headers)
        const token = await this.auth.getJweInJwt({ ...user, refreshToken: newRefreshToken })

        this.tokenCacheService
            .revokeRefreshToken(refreshTokenValue, this.tokenExpirationService.revocationExpiration(user.sessionType, tokenExp))
            .catch((err) => this.logger.fatal('Failed to remove token from cache', err))

        return token
    }

    async refreshServiceEntranceToken(user: ServiceEntranceTokenData, refreshToken: RefreshToken, tokenExp?: number): Promise<string> {
        const { value: refreshTokenValue } = refreshToken
        const newRefreshToken: RefreshToken = await this.refreshTokenService.refresh(refreshTokenValue, user.sessionType)
        const token: string = await this.auth.getJweInJwt({ ...user, refreshToken: newRefreshToken })

        await this.tokenCacheService.revokeRefreshToken(
            refreshTokenValue,
            this.tokenExpirationService.revocationExpiration(user.sessionType, tokenExp),
        )

        return token
    }

    async refreshServiceUserToken(user: ServiceUserTokenData, refreshToken: RefreshToken, tokenExp?: number): Promise<string> {
        const { value: refreshTokenValue } = refreshToken
        const newRefreshToken: RefreshToken = await this.refreshTokenService.refresh(refreshTokenValue, user.sessionType)
        const token: string = await this.auth.getJweInJwt({ ...user, refreshToken: newRefreshToken })

        await this.tokenCacheService.revokeRefreshToken(
            refreshTokenValue,
            this.tokenExpirationService.revocationExpiration(user.sessionType, tokenExp),
        )

        return token
    }

    async getTemporaryToken(headers: UserActionHeaders): Promise<string> {
        const { traceId, mobileUid } = headers
        const refreshToken: RefreshToken = await this.refreshTokenService.create(traceId, SessionType.Temporary, { mobileUid })
        const customTokenSignOptions: Record<string, unknown> = {
            jwtid: mobileUid,
        }
        const customCoreAuthService = await this.getCustomCoreAuthService(customTokenSignOptions)

        const token: string = await customCoreAuthService.getJweInJwt({
            mobileUid,
            refreshToken,
            sessionType: SessionType.Temporary,
            jti: mobileUid,
            scope: [
                'face-recognition',
                'face-recognition-v2',
                'nfc-document-reading',
                'face-verification',
                'face-verification-v2',
                'distributed-key',
                'distributed-sign',
                'distributed-sign-dps',
            ],
        })

        await this.nfcService.saveNfcVerificationRequest(mobileUid, {
            uuid: traceId,
            request: {
                mobileUid,
                token,
            },
        })

        return token
    }

    async getServiceEntranceToken(otp: string, mobileUid: string, traceId: string): Promise<string> {
        let serviceEntranceData: GetServiceEntranceDataByOtpResult
        try {
            serviceEntranceData = await this.documentAcquirersService.getServiceEntranceDataByOtp(otp)
        } catch (err) {
            const errorMsg = 'Offer request not found by the provided otp'

            this.logger.error(errorMsg, { err })

            throw new UnauthorizedError(errorMsg)
        }

        const { acquirerId, branchHashId, offerHashId, offerRequestHashId, offerRequestExpiration } = serviceEntranceData
        const customLifetime: number = offerRequestExpiration - Date.now()
        if (customLifetime <= 0) {
            throw new UnauthorizedError('Offer request is expired')
        }

        this.logger.info('Service entrance refresh token lifetime', { refreshTokenLifeTime: customLifetime })
        const refreshToken: RefreshToken = await this.refreshTokenService.create(traceId, SessionType.ServiceEntrance, {
            mobileUid,
            customLifetime,
            entityId: offerRequestHashId,
        })
        const tokenData: ServiceEntranceTokenData = {
            acquirerId,
            branchHashId,
            offerHashId,
            offerRequestHashId,
            mobileUid,
            refreshToken,
            sessionType: SessionType.ServiceEntrance,
        }

        return await this.auth.getJweInJwt(tokenData)
    }

    private assertUserIsValid(user: Partial<User> | undefined): asserts user is User {
        if (!user) {
            throw new UnauthorizedError()
        }

        this.logger.info('User is received, start validation')
        const { itn, fName } = user
        const isValid = !!(itn && fName)
        // && user.lName && user.birthDay; commented, because not all banks from BankId return all necessary data

        if (!isValid) {
            throw new UnauthorizedError()
        }

        this.authTokenService.checkForValidItn(itn)
    }

    private async getCustomCoreAuthService(customTokenSignOptions?: Record<string, unknown>): Promise<AuthCryptoService> {
        if (!this.customCoreAuthService) {
            const temporaryTokenSignOptions = this.config.auth.temporaryTokenSignOptions
            if (customTokenSignOptions) {
                Object.assign(temporaryTokenSignOptions, customTokenSignOptions)
            }

            const copyOfAuthConfig = cloneDeep(this.config.auth)
            const authParams = set(copyOfAuthConfig, 'jwt.tokenSignOptions', temporaryTokenSignOptions)

            this.customCoreAuthService = this.auth.newInstance(authParams, this.logger)
            await this.customCoreAuthService.onInit()
        }

        return this.customCoreAuthService
    }

    private extractBirthday(user: User, isValidItn = true): ExtractBirthdayResult {
        const { gender, birthDay, itn } = user
        const userBirthDay: string = birthDay
        if (!gender) {
            return { birthDay, invalidBirthday: userBirthDay }
        }

        if (this.appUtils.findDateFormat(userBirthDay)) {
            return { birthDay, validBirthday: userBirthDay }
        }

        if (isValidItn) {
            const validBirthday: string = utils.getBirthDayFromItn(itn)

            return { birthDay: validBirthday, validBirthday, invalidBirthday: userBirthDay }
        }

        this.logger.error(`Invalid birth day format [${userBirthDay}]`)

        return { birthDay, invalidBirthday: userBirthDay }
    }

    private async validateFlow({ method, requestId, mobileUid, bankId }: ValidateParams): Promise<void> {
        if (method === AuthMethod.Nfc && !(await this.refreshTokenService.isTemporaryTokenInvalidate(mobileUid))) {
            const msg = 'Invalid nfc flow'

            this.logger.error(msg, { requestId })

            throw new BadRequestError(msg)
        }

        if (method === AuthMethod.EResidentNfc && !(await this.refreshTokenService.isTemporaryTokenInvalidate(mobileUid))) {
            const msg = 'Invalid nfc flow'

            this.logger.error(msg, { requestId })

            throw new BadRequestError(msg, {}, ProcessCode.EResidentAuthFail)
        }

        if (method === AuthMethod.BankId && !bankId) {
            throw new BadRequestError('Bank id should be provided')
        }

        if (method === AuthMethod.BankId && bankId) {
            await this.bankIdAuthRequestService.validateRequest(mobileUid, bankId)
        }
    }

    private async mapAndVerifyUserData(method: AuthMethod, requestId: string, userData: void | AuthMethodVerifyResult): Promise<User> {
        if (!userData) {
            throw new BadRequestError('Failed to retrieve user', { provider: method, requestId })
        }

        const mappedUser: User = this.userDataMapper.toEntity(userData)

        this.assertUserIsValid(mappedUser)

        return mappedUser
    }

    private async generateUserToken(
        user: User,
        headers: UserActionHeaders,
        authEntryPoint: AuthEntryPoint,
        identifier: string,
        sessionType: AuthUserSessionType = SessionType.EResident,
    ): Promise<GenerateTokenResult> {
        this.logger.debug('User data to encrypt', user)
        const { itn } = user
        const { mobileUid } = headers

        if ([SessionType.User, SessionType.CabinetUser].includes(sessionType)) {
            await this.eisVerifierService.verify(user.itn, headers)
        }

        const refreshToken: RefreshToken = await this.createRefreshToken(identifier, headers, authEntryPoint, sessionType)

        const isValidItn = utils.isItnChecksumValid(itn)
        const birthDayInfo = this.extractBirthday(user, isValidItn)
        const { validBirthday, invalidBirthday } = birthDayInfo
        const birthDay = validBirthday || invalidBirthday

        this.sendBirthDayValidationAnalytics(identifier, headers, authEntryPoint, birthDayInfo)
        this.sendItnValidationAnalytics(identifier, headers, authEntryPoint, itn, isValidItn)

        const tokenData: AuthUser = {
            ...user,
            ...(birthDay && { birthDay }),
            identifier,
            mobileUid,
            authEntryPoint,
            refreshToken,
            sessionType,
        }

        const token = await this.createToken(identifier, headers, tokenData, sessionType, validBirthday)

        return { token, identifier, tokenData }
    }

    private async generateEResidentApplicantToken(
        user: EResidentApplicant,
        headers: UserActionHeaders,
        authEntryPoint: AuthEntryPoint,
        identifier: string,
    ): Promise<GenerateTokenResult> {
        this.logger.debug('User data to encrypt', user)
        const { mobileUid } = headers
        const sessionType = SessionType.EResidentApplicant

        const refreshToken: RefreshToken = await this.createRefreshToken(identifier, headers, authEntryPoint, sessionType)

        const tokenData: AuthUser = {
            ...user,
            identifier,
            mobileUid,
            authEntryPoint,
            refreshToken,
            sessionType,
        }

        const token = await this.createToken(identifier, headers, tokenData, sessionType, undefined)

        return { identifier, tokenData, token }
    }

    private async createRefreshToken(
        userIdentifier: string,
        headers: UserActionHeaders,
        authEntryPoint: AuthEntryPoint,
        sessionType: AuthUserSessionType,
    ): Promise<RefreshToken> {
        const { platformType, appVersion, mobileUid, traceId } = headers
        const customLifetime = await this.customRefreshTokenExpirationService.getByPlatformTypeAndAppVersion(platformType, appVersion)

        await this.refreshTokenService.removeTokensByMobileUid(mobileUid, userIdentifier, sessionType)
        const refreshToken: RefreshToken = await this.refreshTokenService.create(
            traceId,
            sessionType,
            { mobileUid, authEntryPoint, customLifetime, userIdentifier },
            headers,
        )

        return refreshToken
    }

    private async createToken(
        userIdentifier: string,
        headers: UserActionHeaders,
        tokenData: AuthUser,
        sessionType: AuthUserSessionType,
        validBirthday: string | undefined,
    ): Promise<string> {
        const { mobileUid } = headers
        const tasks = [this.notificationService.assignUserToPushToken(mobileUid, userIdentifier)]

        if (validBirthday) {
            tasks.push(this.userService.createOrUpdateProfile(tokenData, headers, sessionType))
        }

        const token: string = await this.auth.getJweInJwt(
            tokenData,
            this.tokenExpirationService.getTokenExpirationBySessionType(sessionType),
        )

        await Promise.all(tasks)

        return token
    }

    private sendAnalytics(
        message: string,
        identifier: string,
        headers: UserActionHeaders,
        additionalInformation: object,
        authEntryPoint?: AuthEntryPoint,
    ): void {
        const { appVersion, mobileUid, platformType, platformVersion } = headers

        this.logger.info(
            message,
            merge(
                {
                    analytics: {
                        date: new Date().toISOString(),
                        category: 'auth',
                        action: {
                            type: 'validation',
                            result: AnalyticsActionResult.Error,
                        },
                        identifier,
                        appVersion,
                        device: {
                            identifier: mobileUid,
                            platform: {
                                type: platformType,
                                version: platformVersion,
                            },
                        },
                        data: {
                            ...authEntryPoint,
                            reason: message,
                        },
                    },
                },
                additionalInformation,
            ),
        )
    }

    private sendSuccessTokenGenerationAnalytics<T = User>(params: GetTokenParams<T>, identifier: string): void {
        const { headers, bankId, method } = params
        const isBankId: boolean = method === AuthMethod.BankId
        let analyticsData: Record<string, unknown> = {}
        if (isBankId) {
            analyticsData = {
                bankId,
            }
        }

        this.sendAnalytics('Success token generation', identifier, headers, {
            analytics: {
                action: {
                    type: method,
                    result: AnalyticsActionResult.Success,
                },
                data: analyticsData,
            },
        })
    }

    private sendBirthDayValidationAnalytics(
        identifier: string,
        headers: UserActionHeaders,
        authEntryPoint: AuthEntryPoint,
        birthDayInfo: ExtractBirthdayResult,
    ): void {
        const { validBirthday, invalidBirthday } = birthDayInfo
        if (validBirthday && invalidBirthday && authEntryPoint) {
            this.sendAnalytics(
                'Birthday is not valid',
                identifier,
                headers,
                {
                    analytics: {
                        data: {
                            parameters: {
                                ivalidBirthDate: invalidBirthday,
                                birthDateFromRnokpp: validBirthday,
                            },
                        },
                    },
                },
                authEntryPoint,
            )
        }
    }

    private sendItnValidationAnalytics(
        identifier: string,
        headers: UserActionHeaders,
        authEntryPoint: AuthEntryPoint,
        itn: string,
        isValidItn: boolean,
    ): void {
        if (authEntryPoint && !isValidItn) {
            this.sendAnalytics(
                'rnokpp is not valid',
                identifier,
                headers,
                {
                    analytics: {
                        data: {
                            parameters: {
                                invalidItn: itn,
                            },
                        },
                    },
                },
                authEntryPoint,
            )
        }
    }
}
