import { AnalyticsActionResult } from '@diia-inhouse/analytics'
import { AuthService, IdentifierService } from '@diia-inhouse/crypto'
import { EnvService } from '@diia-inhouse/env'
import { BadRequestError } from '@diia-inhouse/errors'
import {
    AppUserActionHeaders,
    AuthDocument,
    AuthDocumentType,
    AuthEntryPoint,
    Gender,
    Logger,
    SessionType,
    User,
    UserTokenData,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import Utils from '@src/utils'

import AuthTokenService from '@services/authToken'
import CustomRefreshTokenExpirationService from '@services/customRefreshTokenExpiration'
import EisVerifier from '@services/eisVerifier'
import NotificationService from '@services/notification'
import RefreshTokenService from '@services/refreshToken'
import UserService from '@services/user'
import UserAuthTokenService from '@services/userAuthToken'

import { AppConfig } from '@interfaces/config'
import { GetUserTokenOps, ProvidedUserData, testTarget } from '@interfaces/services/test'
import { GenerateTokenResult } from '@interfaces/services/userAuthToken'

export default class TestAuthTokenService {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly identifier: IdentifierService,
        private readonly auth: AuthService,
        private readonly envService: EnvService,

        private readonly appUtils: Utils,
        private readonly authTokenService: AuthTokenService,
        private readonly eisVerifierService: EisVerifier,
        private readonly customRefreshTokenExpirationService: CustomRefreshTokenExpirationService,
        private readonly notificationService: NotificationService,
        private readonly userService: UserService,
        private readonly userAuthTokenService: UserAuthTokenService,
        private readonly refreshTokenService: RefreshTokenService,
    ) {}

    async getUserToken(
        requestId: string,
        headers: AppUserActionHeaders,
        providedUserData: ProvidedUserData,
        { skipLogoutEvent }: GetUserTokenOps = {},
    ): Promise<GenerateTokenResult> {
        const { mobileUid, traceId, platformType, platformVersion, appVersion } = headers
        if (this.config.authService.testAuthByItnIsEnabled === false) {
            this.logger.info('Provider test is not implemented')

            throw new BadRequestError('Validation failed')
        }

        this.logger.info('Start receiving test token', { requestId, mobileUid, traceId, providedUserData })

        const user = this.getTestData(requestId, providedUserData)

        const { birthDay, itn } = user
        const identifier = this.identifier.createIdentifier(itn)

        await this.authTokenService.clearUserSessionData(identifier, mobileUid, skipLogoutEvent)

        await this.eisVerifierService.verify(requestId, headers)

        const sessionType = SessionType.User
        const authEntryPoint: AuthEntryPoint = {
            target: testTarget,
            isBankId: false,
        }

        const customLifetime = await this.customRefreshTokenExpirationService.getByPlatformTypeAndAppVersion(platformType, appVersion)

        const refreshToken = await this.refreshTokenService.create(
            traceId,
            sessionType,
            { mobileUid, authEntryPoint, customLifetime, userIdentifier: identifier },
            headers,
        )

        this.logger.debug('User data to encrypt', user)

        const tokenData: UserTokenData = {
            ...user,
            identifier,
            mobileUid,
            authEntryPoint,
            refreshToken,
            sessionType,
        }

        const isValidItn = utils.isItnChecksumValid(itn)
        if (!isValidItn) {
            this.logger.info('rnokpp is not valid', {
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
                        reason: 'rnokpp is not valid',
                        parameters: {
                            invalidItn: itn,
                        },
                    },
                },
            })
        }

        this.authTokenService.checkForValidItn(itn)

        const token = await this.auth.getJweInJwt(tokenData)

        const tasks = [this.notificationService.assignUserToPushToken(mobileUid, identifier)]
        if (this.appUtils.findDateFormat(birthDay) && !this.envService.isProd()) {
            tasks.push(this.userService.createOrUpdateProfile(tokenData, headers, SessionType.User))
        } else {
            this.logger.error(`Invalid birth day format [${birthDay}]`)
        }

        await Promise.all(tasks)

        await this.userAuthTokenService.sendAuthNotification(tokenData, mobileUid)

        return { token, identifier, tokenData }
    }

    getTestData(itn: string, providedUserData: ProvidedUserData): User {
        const documentValue = 'АБ654321-notvalid'
        const testData: User = {
            fName: 'АНЖЕЛІКА',
            lName: 'ПАШУЛЬ',
            mName: 'В`ЯЧЕСЛАВІВНА',
            itn,
            passport: documentValue,
            document: {
                value: documentValue,
                type: this.appUtils.getDocumentType(documentValue),
            },
            email: 'ostapenko@example.com',
            phoneNumber: '+380998887766',
            birthDay: '01.01.2000',
            addressOfRegistration: '',
            addressOfBirth: '',
            gender: Gender.female,
        }

        const providedUserDataKeys = <(keyof ProvidedUserData)[]>(<unknown>Object.keys(providedUserData))

        for (const key of providedUserDataKeys) {
            const userValue = providedUserData[key]
            if (!userValue) {
                if (this.isNoMockField(key)) {
                    testData[key] = ''
                }

                continue
            }

            switch (key) {
                case 'birthDay': {
                    testData[key] = this.appUtils.normalizeBirthDay(userValue)

                    break
                }
                case 'document': {
                    const documentType: AuthDocumentType = this.appUtils.getDocumentType(userValue)
                    const document: AuthDocument = {
                        value: this.appUtils.normalizeDocumentValue(userValue, documentType),
                        type: documentType,
                    }

                    testData[key] = document
                    testData.passport = document.value

                    break
                }
                case 'fName':
                case 'lName':
                case 'mName': {
                    testData[key] = utils.capitalizeName(userValue)

                    break
                }
                case 'gender': {
                    testData[key] = providedUserData[key]!

                    break
                }
                default: {
                    testData[key] = providedUserData[key]!
                }
            }
        }

        return testData
    }

    private isNoMockField(key: string): key is 'mName' | 'email' {
        return ['mName', 'email'].includes(key)
    }
}
