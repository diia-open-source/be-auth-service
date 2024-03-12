import { randomUUID } from 'crypto'

import { AuthService, IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { EnvService } from '@diia-inhouse/env'
import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { AuthDocumentType, DurationMs, Gender, SessionType } from '@diia-inhouse/types'

import Utils from '@src/utils'

import AuthTokenService from '@services/authToken'
import CustomRefreshTokenExpirationService from '@services/customRefreshTokenExpiration'
import EisVerifier from '@services/eisVerifier'
import NotificationService from '@services/notification'
import RefreshTokenService from '@services/refreshToken'
import TestAuthTokenService from '@services/test'
import UserService from '@services/user'
import UserAuthTokenService from '@services/userAuthToken'

import { AppConfig } from '@interfaces/config'
import { ProvidedUserData } from '@interfaces/services/test'

describe(`${TestAuthTokenService.constructor.name}`, () => {
    const identifierService = new IdentifierService({ salt: 'salt' })
    const testKit = new TestKit()
    const testItn = testKit.random.getRandomInt(1, 9998).toString()
    const identifier = identifierService.createIdentifier(testItn)
    const config = <AppConfig>(<unknown>{
        applicationStoreReview: {
            testItn,
        },
        auth: {
            testAuthByItnIsEnabled: true,
            jwk: randomUUID(),
            jwt: {
                privateKey: randomUUID(),
                publicKey: randomUUID(),
                tokenSignOptions: {
                    algorithm: 'SHA256',
                    expiresIn: '30m',
                },
                tokenVerifyOptions: {
                    algorithms: ['SHA256'],
                    ignoreExpiration: false,
                },
            },
        },
    })
    const logger = mockInstance(DiiaLogger)
    const appUtils = new Utils(identifierService)
    const authTokenService = mockInstance(AuthTokenService)
    const authService = mockInstance(AuthService)
    const customRefreshTokenExpirationService = mockInstance(CustomRefreshTokenExpirationService)
    const eisVerifierService = mockInstance(EisVerifier)
    const envService = new EnvService(mockInstance(DiiaLogger))
    const notificationService = mockInstance(NotificationService)
    const refreshTokenService = mockInstance(RefreshTokenService)
    const userService = mockInstance(UserService)
    const userAuthTokenService = mockInstance(UserAuthTokenService)

    const testAuthTokenService = new TestAuthTokenService(
        config,
        logger,
        identifierService,
        authService,
        envService,
        appUtils,
        authTokenService,
        eisVerifierService,
        customRefreshTokenExpirationService,
        notificationService,
        userService,
        userAuthTokenService,
        refreshTokenService,
    )

    describe(`method: ${testAuthTokenService.getUserToken.name}`, () => {
        it('should throw error if testAuthByItn is not enabled', async () => {
            const headers = testKit.session.getHeaders()
            const expectedError = new BadRequestError('Validation failed')
            const service = new TestAuthTokenService(
                { ...config, auth: { ...config.auth, testAuthByItnIsEnabled: false } },
                logger,
                identifierService,
                authService,
                envService,
                appUtils,
                authTokenService,
                eisVerifierService,
                customRefreshTokenExpirationService,
                notificationService,
                userService,
                userAuthTokenService,
                refreshTokenService,
            )

            await expect(service.getUserToken(testItn, headers, {})).rejects.toThrow(expectedError)
        })

        it('should log error if birth day format is not recognized', async () => {
            const headers = testKit.session.getHeaders()
            const refreshToken = {
                value: randomUUID(),
                expirationTime: Date.now() + DurationMs.Day,
            }
            const token = randomUUID()
            const birthDay = '01 січня 2000'

            jest.spyOn(authTokenService, 'clearUserSessionData').mockResolvedValueOnce()
            jest.spyOn(authTokenService, 'checkForValidItn').mockReturnValueOnce()
            jest.spyOn(eisVerifierService, 'verify').mockResolvedValueOnce()
            jest.spyOn(customRefreshTokenExpirationService, 'getByPlatformTypeAndAppVersion').mockResolvedValue(DurationMs.Day)
            jest.spyOn(refreshTokenService, 'create').mockResolvedValueOnce(refreshToken)
            jest.spyOn(authService, 'getJweInJwt').mockResolvedValueOnce(token)
            jest.spyOn(notificationService, 'assignUserToPushToken').mockResolvedValueOnce()
            jest.spyOn(userAuthTokenService, 'sendAuthNotification').mockResolvedValueOnce()

            const createOrUpdateProfileSpy = jest.spyOn(userService, 'createOrUpdateProfile')

            await testAuthTokenService.getUserToken(testItn, headers, { birthDay })

            expect(createOrUpdateProfileSpy).toHaveBeenCalledTimes(0)
            expect(logger.error).toHaveBeenCalledWith(`Invalid birth day format [${birthDay}]`)
        })

        it.each([
            [<ProvidedUserData>(<unknown>{ mName: null }), { mName: '' }],
            [{ email: '' }, { email: '' }],
            [{ birthDay: '01-01-2000' }, { birthDay: '01.01.2000' }],
            [{ document: 'FM654321' }, { document: { type: AuthDocumentType.ForeignPassport, value: 'FM654321' }, passport: 'FM654321' }],
            [{ gender: <Gender>'unknown' }, { gender: 'unknown' }],
            [{ addressOfRegistration: 'Registration Address' }, { addressOfRegistration: 'Registration Address' }],
            [
                { fName: 'анжеліка', lName: 'пашуль', mName: 'в`ячеславівна' },
                { fName: 'Анжеліка', lName: 'Пашуль', mName: 'В`ячеславівна' },
            ],
        ])('should add provided user data to token data', async (providedUserData: ProvidedUserData, expectedUserData) => {
            const headers = testKit.session.getHeaders()
            const { mobileUid, platformType, appVersion } = headers
            const refreshToken = {
                value: randomUUID(),
                expirationTime: Date.now() + DurationMs.Day,
            }
            const token = randomUUID()

            const clearUserSessionDataSpy = jest.spyOn(authTokenService, 'clearUserSessionData').mockResolvedValueOnce()
            const checkForValidItnSpy = jest.spyOn(authTokenService, 'checkForValidItn').mockReturnValueOnce()
            const eisVerifySpy = jest.spyOn(eisVerifierService, 'verify').mockResolvedValueOnce()
            const getByPlatformTypeAndAppVersionSpy = jest
                .spyOn(customRefreshTokenExpirationService, 'getByPlatformTypeAndAppVersion')
                .mockResolvedValue(DurationMs.Day)
            const createRefreshTokenSpy = jest.spyOn(refreshTokenService, 'create').mockResolvedValueOnce(refreshToken)
            const getJweInJwtSpy = jest.spyOn(authService, 'getJweInJwt').mockResolvedValueOnce(token)
            const assignUserToPushTokenSpy = jest.spyOn(notificationService, 'assignUserToPushToken').mockResolvedValueOnce()
            const createOrUpdateProfileSpy = jest.spyOn(userService, 'createOrUpdateProfile').mockResolvedValueOnce()
            const sendAuthNotificationSpy = jest.spyOn(userAuthTokenService, 'sendAuthNotification').mockResolvedValueOnce()

            const findDateFormatSpy = jest.spyOn(appUtils, 'findDateFormat').mockReturnValueOnce('DD.MM.YYYY')

            const result = await testAuthTokenService.getUserToken(testItn, headers, providedUserData)

            expect(clearUserSessionDataSpy).toHaveBeenCalledWith(identifier, mobileUid)
            expect(eisVerifySpy).toHaveBeenCalledWith(testItn, headers)
            expect(getByPlatformTypeAndAppVersionSpy).toHaveBeenCalledWith(platformType, appVersion)
            expect(createRefreshTokenSpy).toHaveBeenCalled()
            expect(checkForValidItnSpy).toHaveBeenCalledWith(testItn)
            expect(getJweInJwtSpy).toHaveBeenCalled()
            expect(assignUserToPushTokenSpy).toHaveBeenCalled()
            expect(createOrUpdateProfileSpy).toHaveBeenCalled()
            expect(findDateFormatSpy).toHaveBeenCalled()
            expect(sendAuthNotificationSpy).toHaveBeenCalled()
            expect(result).toEqual({
                tokenData: {
                    addressOfBirth: '',
                    addressOfRegistration: '',
                    authEntryPoint: {
                        target: 'Test',
                        isBankId: false,
                    },
                    birthDay: '01.01.2000',
                    document: {
                        value: 'АБ654321-notvalid',
                        type: AuthDocumentType.Unknown,
                    },
                    email: 'ostapenko@example.com',
                    fName: 'АНЖЕЛІКА',
                    gender: Gender.female,
                    identifier,
                    itn: testItn,
                    lName: 'ПАШУЛЬ',
                    mName: 'В`ЯЧЕСЛАВІВНА',
                    mobileUid,
                    passport: 'АБ654321-notvalid',
                    phoneNumber: '+380998887766',
                    refreshToken,
                    sessionType: SessionType.User,
                    ...expectedUserData,
                },
                token,
                identifier,
            })
        })

        it('should return user token', async () => {
            const headers = testKit.session.getHeaders()
            const { mobileUid, platformType, appVersion } = headers
            const refreshToken = {
                value: randomUUID(),
                expirationTime: Date.now() + DurationMs.Day,
            }
            const token = randomUUID()

            const clearUserSessionDataSpy = jest.spyOn(authTokenService, 'clearUserSessionData').mockResolvedValueOnce()
            const checkForValidItnSpy = jest.spyOn(authTokenService, 'checkForValidItn').mockReturnValueOnce()
            const eisVerifySpy = jest.spyOn(eisVerifierService, 'verify').mockResolvedValueOnce()
            const getByPlatformTypeAndAppVersionSpy = jest
                .spyOn(customRefreshTokenExpirationService, 'getByPlatformTypeAndAppVersion')
                .mockResolvedValue(DurationMs.Day)
            const createRefreshTokenSpy = jest.spyOn(refreshTokenService, 'create').mockResolvedValueOnce(refreshToken)
            const getJweInJwtSpy = jest.spyOn(authService, 'getJweInJwt').mockResolvedValueOnce(token)
            const assignUserToPushTokenSpy = jest.spyOn(notificationService, 'assignUserToPushToken').mockResolvedValueOnce()
            const createOrUpdateProfileSpy = jest.spyOn(userService, 'createOrUpdateProfile').mockResolvedValueOnce()
            const sendAuthNotificationSpy = jest.spyOn(userAuthTokenService, 'sendAuthNotification').mockResolvedValueOnce()

            const result = await testAuthTokenService.getUserToken(testItn, headers, {})

            expect(clearUserSessionDataSpy).toHaveBeenCalledWith(identifier, mobileUid)
            expect(eisVerifySpy).toHaveBeenCalledWith(testItn, headers)
            expect(getByPlatformTypeAndAppVersionSpy).toHaveBeenCalledWith(platformType, appVersion)
            expect(createRefreshTokenSpy).toHaveBeenCalled()
            expect(checkForValidItnSpy).toHaveBeenCalledWith(testItn)
            expect(getJweInJwtSpy).toHaveBeenCalled()
            expect(assignUserToPushTokenSpy).toHaveBeenCalled()
            expect(createOrUpdateProfileSpy).toHaveBeenCalled()
            expect(sendAuthNotificationSpy).toHaveBeenCalled()
            expect(result).toEqual({
                tokenData: {
                    addressOfBirth: '',
                    addressOfRegistration: '',
                    authEntryPoint: {
                        target: 'Test',
                        isBankId: false,
                    },
                    birthDay: '01.01.2000',
                    document: {
                        value: 'АБ654321-notvalid',
                        type: AuthDocumentType.Unknown,
                    },
                    email: 'ostapenko@example.com',
                    fName: 'АНЖЕЛІКА',
                    gender: Gender.female,
                    identifier,
                    itn: testItn,
                    lName: 'ПАШУЛЬ',
                    mName: 'В`ЯЧЕСЛАВІВНА',
                    mobileUid,
                    passport: 'АБ654321-notvalid',
                    phoneNumber: '+380998887766',
                    refreshToken,
                    sessionType: SessionType.User,
                },
                token,
                identifier,
            })
        })
    })
})
