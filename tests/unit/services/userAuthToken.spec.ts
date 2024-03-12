import { ObjectId } from 'bson'

import { AuthService as AuthCryptoService, IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError, UnauthorizedError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import {
    AuthDocumentType,
    DocumentTypeCamelCase,
    Gender,
    ServiceEntranceTokenData,
    ServiceUserTokenData,
    SessionType,
    User,
    UserTokenData,
} from '@diia-inhouse/types'

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
import UserAuthTokenService from '@services/userAuthToken'

import UserDataMapper from '@dataMappers/userDataMapper'

import { AppConfig } from '@interfaces/config'
import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { GenderAsSex } from '@interfaces/services/authMethods'
import { GetServiceEntranceDataByOtpResult } from '@interfaces/services/documentAcquirers'
import { AuthType } from '@interfaces/services/session'
import { AuthUser, AuthUserSessionType, GetTokenParams } from '@interfaces/services/userAuthToken'

describe(`UserAuthTokenService`, () => {
    const testKit = new TestKit()
    const config = <AppConfig>(<unknown>{
        eResident: {
            registryIsEnabled: true,
        },
        auth: {
            temporaryTokenSignOptions: {
                algorithm: 'signAlgorithm',
                expiresIn: '1m',
                audience: 'audience',
                issuer: 'issuer',
            },
        },
    })
    const loggerServiceMock = mockInstance(DiiaLogger)
    const identifierServiceMock = mockInstance(IdentifierService)
    const authCryptoServiceMock = mockInstance(AuthCryptoService)
    const utilsMock = mockInstance(Utils)
    const authTokenServiceMock = mockInstance(AuthTokenService)
    const eResidentFirstAuthServiceMock = mockInstance(EResidentFirstAuthService)
    const authServiceMock = mockInstance(AuthService)
    const userServiceMock = mockInstance(UserService)
    const sessionServiceMock = mockInstance(SessionService)
    const notificationServiceMock = mockInstance(NotificationService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const customRefreshTokenExpirationServiceMock = mockInstance(CustomRefreshTokenExpirationService)
    const userAuthStepsAuthDataServiceMock = mockInstance(UserAuthStepsAuthDataService)
    const tokenCacheServiceMock = mockInstance(TokenCacheService)
    const nfcServiceMock = mockInstance(NfcService)
    const documentAcquirersServiceMock = mockInstance(DocumentAcquirersService)
    const bankIdAuthRequestServiceMock = mockInstance(BankIdAuthRequestService)
    const eisVerifierServiceMock = mockInstance(EisVerifierService)
    const tokenExpirationService = mockInstance(TokenExpirationService)
    const userDataMapperMock = mockInstance(UserDataMapper)

    const userAuthTokenService = new UserAuthTokenService(
        loggerServiceMock,
        identifierServiceMock,
        authCryptoServiceMock,
        config,
        utilsMock,
        authTokenServiceMock,
        eResidentFirstAuthServiceMock,
        authServiceMock,
        userServiceMock,
        sessionServiceMock,
        notificationServiceMock,
        refreshTokenServiceMock,
        customRefreshTokenExpirationServiceMock,
        userAuthStepsAuthDataServiceMock,
        tokenCacheServiceMock,
        nfcServiceMock,
        documentAcquirersServiceMock,
        bankIdAuthRequestServiceMock,
        eisVerifierServiceMock,
        tokenExpirationService,
        userDataMapperMock,
    )

    const headers = testKit.session.getHeaders()
    const birthDay = testKit.session.getBirthDate()
    const gender = testKit.session.getGender()
    const itn = testKit.session.generateItn(birthDay, gender, true)

    describe('method: `getToken`', () => {
        it('should throw AccessDeniedError when session type not provided', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.BankId,
                headers,
                sessionType: <AuthUserSessionType>SessionType.Acquirer,
            }

            await expect(async () => {
                await userAuthTokenService.getToken(params)
            }).rejects.toEqual(new AccessDeniedError(`Unsupported application user session type: ${params.sessionType}`))

            expect(loggerServiceMock.info).toHaveBeenCalledWith('Start receiving token with a specific provider', {
                requestId: params.requestId,
                provider: params.method,
                ...headers,
            })
        })
    })

    describe('method: `getUserToken`', () => {
        it('should throw BadRequestError when a temporary token is valid', async () => {
            const params = <GetTokenParams>{
                requestId: 'requestId',
                user: {},
                headers,
                method: AuthMethod.Nfc,
                sessionType: <AuthUserSessionType>SessionType.EResident,
            }

            jest.spyOn(refreshTokenServiceMock, 'isTemporaryTokenInvalidate').mockImplementationOnce(async () => false)

            await expect(userAuthTokenService.getUserToken(params)).rejects.toBeInstanceOf(BadRequestError)
        })

        it('should throw BadRequestError with nfc auth method and invalid temporary token', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.Nfc,
                headers,
                sessionType: <AuthUserSessionType>SessionType.User,
            }

            await expect(async () => {
                await userAuthTokenService.getUserToken(params)
            }).rejects.toEqual(new BadRequestError('Invalid nfc flow'))

            expect(loggerServiceMock.error).toHaveBeenCalledWith('Invalid nfc flow', { requestId: params.requestId })
        })

        it('should throw BadRequestError with e-resident nfc auth method and invalid temporary token', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.EResidentNfc,
                headers,
                sessionType: <AuthUserSessionType>SessionType.User,
            }

            await expect(async () => {
                await userAuthTokenService.getUserToken(params)
            }).rejects.toEqual(new BadRequestError('Invalid nfc flow', {}, ProcessCode.EResidentAuthFail))

            expect(loggerServiceMock.error).toHaveBeenCalledWith('Invalid nfc flow', { requestId: params.requestId })
        })

        it('should throw BadRequestError with bankId auth method and not provided bankId value', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.BankId,
                headers,
                sessionType: <AuthUserSessionType>SessionType.User,
            }

            await expect(async () => {
                await userAuthTokenService.getUserToken(params)
            }).rejects.toEqual(new BadRequestError('Bank id should be provided'))
        })

        it('should throw BadRequestError if failed to retrieve user', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.BankId,
                headers,
                sessionType: <AuthUserSessionType>SessionType.User,
                bankId: 'bankId',
            }

            await expect(async () => {
                await userAuthTokenService.getUserToken(params)
            }).rejects.toEqual(new BadRequestError('Failed to retrieve user', { provider: params.method, requestId: params.requestId }))
        })

        it('should throw UnauthorizedError if user did not received', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.BankId,
                headers,
                sessionType: <AuthUserSessionType>SessionType.User,
                bankId: 'bankId',
            }

            const user = {
                type: 'type',
                firstName: 'firstName',
                middleName: 'middleName',
                lastName: 'lastName',
                phone: 'phone',
                inn: 'inn',
                birthDay: '01.01.1990',
                sex: GenderAsSex.F,
                email: 'email',
                addresses: [],
                documents: [],
            }

            jest.spyOn(authServiceMock, 'verify').mockResolvedValueOnce(user)
            jest.spyOn(userDataMapperMock, 'toEntity').mockReturnValueOnce(<User>{})

            await expect(async () => {
                await userAuthTokenService.getUserToken(params)
            }).rejects.toEqual(new UnauthorizedError())
        })

        it('should throw UnauthorizedError if received user has not valid data', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.BankId,
                headers,
                sessionType: <AuthUserSessionType>SessionType.User,
                bankId: 'bankId',
            }

            const user = {
                type: 'type',
                firstName: 'firstName',
                middleName: 'middleName',
                lastName: 'lastName',
                phone: 'phone',
                inn: 'inn',
                birthDay: '01.01.1990',
                sex: GenderAsSex.F,
                email: 'email',
                addresses: [],
                documents: [],
            }

            const mappedBankUser = {
                lName: 'lastName',
                mName: 'middleName',
                gender: Gender.female,
                phoneNumber: 'phone',
                email: 'email',
                passport: 'passport',
                document: {
                    value: 'value',
                    type: AuthDocumentType.ForeignPassport,
                },
                addressOfRegistration: 'addressOfRegistration',
                addressOfBirth: 'addressOfBirth',
                birthDay: '01.01.1990',
            }

            jest.spyOn(authServiceMock, 'verify').mockResolvedValueOnce(user)
            jest.spyOn(userDataMapperMock, 'toEntity').mockReturnValueOnce(<User>mappedBankUser)

            await expect(async () => {
                await userAuthTokenService.getUserToken(params)
            }).rejects.toEqual(new UnauthorizedError())
            expect(loggerServiceMock.info).toHaveBeenCalledWith('User is received, start validation')
        })

        it('should return token executing method with user session type', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.BankId,
                headers,
                sessionType: <AuthUserSessionType>SessionType.User,
                bankId: 'bankId',
            }

            const user = {
                type: 'type',
                firstName: 'firstName',
                middleName: 'middleName',
                lastName: 'lastName',
                phone: 'phone',
                inn: 'inn',
                birthDay,
                sex: GenderAsSex.F,
                email: 'email',
                addresses: [],
                documents: [],
            }

            const mappedBankUser = {
                fName: 'firstName',
                lName: 'lastName',
                mName: 'middleName',
                gender,
                itn,
                phoneNumber: 'phone',
                email: 'email',
                passport: 'passport',
                document: {
                    value: 'value',
                    type: AuthDocumentType.ForeignPassport,
                },
                addressOfRegistration: 'addressOfRegistration',
                addressOfBirth: 'addressOfBirth',
                birthDay,
            }

            const token = 'token'
            const identifier = mappedBankUser.itn

            const authEntryPoint = {
                target: 'target',
                isBankId: true,
                bankName: 'bankName',
                document: AuthDocumentType.ForeignPassport,
            }

            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const tokenData: AuthUser = {
                ...mappedBankUser,
                birthDay: mappedBankUser.birthDay,
                identifier,
                mobileUid: headers.mobileUid,
                authEntryPoint,
                refreshToken,
                sessionType: params.sessionType,
            }

            jest.spyOn(authServiceMock, 'verify').mockResolvedValueOnce(user)
            jest.spyOn(userDataMapperMock, 'toEntity').mockReturnValueOnce(mappedBankUser)
            jest.spyOn(authTokenServiceMock, 'checkForValidItn').mockReturnValueOnce()
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(identifier)
            jest.spyOn(authTokenServiceMock, 'clearUserSessionData').mockResolvedValueOnce()
            jest.spyOn(utilsMock, 'getAuthEntryPoint').mockReturnValueOnce(authEntryPoint)
            jest.spyOn(eisVerifierServiceMock, 'verify').mockResolvedValueOnce()
            jest.spyOn(customRefreshTokenExpirationServiceMock, 'getByPlatformTypeAndAppVersion').mockResolvedValueOnce(1000)
            jest.spyOn(refreshTokenServiceMock, 'removeTokensByMobileUid').mockResolvedValueOnce()
            jest.spyOn(refreshTokenServiceMock, 'create').mockResolvedValueOnce(refreshToken)
            jest.spyOn(notificationServiceMock, 'assignUserToPushToken').mockResolvedValueOnce()
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)

            expect(await userAuthTokenService.getUserToken(params)).toMatchObject({ token, identifier, tokenData })

            expect(loggerServiceMock.info).toHaveBeenCalledWith('User is received, start validation')
        })

        it('should store birthdayValidation analytics and call eResidentFirstAuthService', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.EResidentQrCode,
                headers,
                sessionType: <AuthUserSessionType>SessionType.User,
                bankId: 'bankId',
            }

            const user = {
                type: 'type',
                firstName: 'firstName',
                middleName: 'middleName',
                lastName: 'lastName',
                phone: 'phone',
                inn: 'inn',
                birthDay,
                sex: GenderAsSex.F,
                email: 'email',
                addresses: [],
                documents: [],
            }

            const mappedBankUser = {
                fName: 'firstName',
                lName: 'lastName',
                mName: 'middleName',
                gender,
                itn,
                phoneNumber: 'phone',
                email: 'email',
                passport: 'passport',
                document: {
                    value: 'value',
                    type: AuthDocumentType.ForeignPassport,
                },
                addressOfRegistration: 'addressOfRegistration',
                addressOfBirth: 'addressOfBirth',
                birthDay,
            }

            const token = 'token'
            const identifier = mappedBankUser.itn

            const authEntryPoint = {
                target: 'target',
                isBankId: true,
                bankName: 'bankName',
                document: AuthDocumentType.ForeignPassport,
            }

            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const tokenData: AuthUser = {
                ...mappedBankUser,
                birthDay: mappedBankUser.birthDay,
                identifier,
                mobileUid: headers.mobileUid,
                authEntryPoint,
                refreshToken,
                sessionType: params.sessionType,
            }

            jest.spyOn(authServiceMock, 'verify').mockResolvedValueOnce(user)
            jest.spyOn(userDataMapperMock, 'toEntity').mockReturnValueOnce(mappedBankUser)
            jest.spyOn(authTokenServiceMock, 'checkForValidItn').mockReturnValueOnce()
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(identifier)
            jest.spyOn(authTokenServiceMock, 'clearUserSessionData').mockResolvedValueOnce()
            jest.spyOn(utilsMock, 'getAuthEntryPoint').mockReturnValueOnce(authEntryPoint)
            jest.spyOn(eisVerifierServiceMock, 'verify').mockResolvedValueOnce()
            jest.spyOn(customRefreshTokenExpirationServiceMock, 'getByPlatformTypeAndAppVersion').mockResolvedValueOnce(1000)
            jest.spyOn(refreshTokenServiceMock, 'removeTokensByMobileUid').mockResolvedValueOnce()
            jest.spyOn(refreshTokenServiceMock, 'create').mockResolvedValueOnce(refreshToken)
            jest.spyOn(notificationServiceMock, 'assignUserToPushToken').mockResolvedValueOnce()
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)

            await expect(userAuthTokenService.getUserToken(params)).resolves.toMatchObject({ token, identifier, tokenData })

            expect(loggerServiceMock.info).toHaveBeenCalledWith('User is received, start validation')
        })
    })

    describe('method: `getEResidentApplicantToken`', () => {
        it('should throw AccessDeniedError if user not provided', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.Nfc,
                headers,
                sessionType: <AuthUserSessionType>SessionType.EResidentApplicant,
            }

            await expect(async () => {
                await userAuthTokenService.getEResidentApplicantToken(params)
            }).rejects.toEqual(new AccessDeniedError('Applicant data must be specified'))
        })

        it('should return token using method with e-resident applicant session type', async () => {
            const params = {
                requestId: 'requestId',
                method: AuthMethod.Nfc,
                headers,
                sessionType: <AuthUserSessionType>SessionType.EResidentApplicant,
                user: {
                    email: 'email',
                    document: {
                        type: AuthDocumentType.EResidentApplicantEmail,
                        value: 'value',
                    },
                },
            }
            const identifier = 'identifier'
            const token = 'token'
            const authEntryPoint = {
                target: 'target',
                isBankId: true,
                bankName: 'bankName',
                document: AuthDocumentType.ForeignPassport,
            }

            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const tokenData: AuthUser = {
                ...params.user,
                identifier,
                mobileUid: headers.mobileUid,
                authEntryPoint,
                refreshToken,
                sessionType: SessionType.EResidentApplicant,
            }

            const sessions = [
                {
                    id: 'id',
                    status: true,
                    platform: {
                        type: 'type',
                        version: 'version',
                    },
                    appVersion: '1.0.0',
                    auth: {
                        type: AuthType.EResidentNfc,
                        creationDate: 'creationDate',
                        lastActivityDate: 'lastActivityDate',
                    },
                },
                {
                    id: 'id2',
                    status: true,
                    platform: {
                        type: 'type',
                        version: 'version',
                    },
                    appVersion: '1.0.0',
                    auth: {
                        type: AuthType.EResidentNfc,
                        creationDate: 'creationDate',
                        lastActivityDate: 'lastActivityDate',
                    },
                },
            ]

            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(identifier)
            jest.spyOn(authTokenServiceMock, 'clearUserSessionData').mockResolvedValueOnce()
            jest.spyOn(utilsMock, 'getAuthEntryPoint').mockReturnValueOnce(authEntryPoint)
            jest.spyOn(customRefreshTokenExpirationServiceMock, 'getByPlatformTypeAndAppVersion').mockResolvedValueOnce(1000)
            jest.spyOn(refreshTokenServiceMock, 'removeTokensByMobileUid').mockResolvedValueOnce()
            jest.spyOn(refreshTokenServiceMock, 'create').mockResolvedValueOnce(refreshToken)
            jest.spyOn(notificationServiceMock, 'assignUserToPushToken').mockResolvedValueOnce()
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)
            jest.spyOn(sessionServiceMock, 'getSessions').mockResolvedValueOnce(sessions)
            jest.spyOn(notificationServiceMock, 'createNotificationWithPushes').mockResolvedValueOnce()

            expect(await userAuthTokenService.getEResidentApplicantToken(params)).toMatchObject({ token, identifier, tokenData })
            expect(loggerServiceMock.debug).toHaveBeenCalledWith('User data to encrypt', params.user)
        })
    })

    describe('method: `getNfcUserToken`', () => {
        it('should throw BadRequestError if valid refresh token not found', async () => {
            jest.spyOn(refreshTokenServiceMock, 'isTemporaryTokenInvalidate').mockResolvedValueOnce(false)

            await expect(async () => {
                await userAuthTokenService.getNfcUserToken(headers)
            }).rejects.toEqual(new BadRequestError('Invalid nfc flow'))
        })

        it('should return token using nfc auth method', async () => {
            const userData = {
                docType: DocumentTypeCamelCase.foreignPassport,
                docSerie: 'docSerie',
                docNumber: 'docNumber',
                firstName: 'firstName',
                lastName: 'lastName',
                middleName: 'middleName',
                itn,
                recordNumber: 'recordNumber',
                birthDay: '25.08.1956',
                gender: GenderAsSex.F,
            }

            const mappedNfcUser = {
                fName: 'firstName',
                lName: 'lastName',
                mName: 'middleName',
                gender,
                itn,
                passport: 'passport',
                document: {
                    value: 'value',
                    type: AuthDocumentType.ForeignPassport,
                },
                birthDay,
            }

            const identifier = mappedNfcUser.itn

            const authEntryPoint = {
                target: 'target',
                isBankId: true,
                bankName: 'bankName',
                document: AuthDocumentType.ForeignPassport,
            }

            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const token = 'token'

            const tokenData = {
                ...mappedNfcUser,
                birthDay: mappedNfcUser.birthDay,
                identifier,
                mobileUid: headers.mobileUid,
                authEntryPoint,
                refreshToken,
                sessionType: SessionType.User,
            }

            const result = { token, identifier, tokenData }

            jest.spyOn(refreshTokenServiceMock, 'isTemporaryTokenInvalidate').mockResolvedValueOnce(true)
            jest.spyOn(authServiceMock, 'verify').mockResolvedValueOnce(userData)
            jest.spyOn(userDataMapperMock, 'fromNfcToEntity').mockReturnValueOnce(<User>mappedNfcUser)
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(identifier)
            jest.spyOn(authTokenServiceMock, 'clearUserSessionData').mockResolvedValueOnce()
            jest.spyOn(utilsMock, 'getAuthEntryPoint').mockReturnValueOnce(authEntryPoint)
            jest.spyOn(customRefreshTokenExpirationServiceMock, 'getByPlatformTypeAndAppVersion').mockResolvedValueOnce(1000)
            jest.spyOn(refreshTokenServiceMock, 'removeTokensByMobileUid').mockResolvedValueOnce()
            jest.spyOn(refreshTokenServiceMock, 'create').mockResolvedValueOnce(refreshToken)
            jest.spyOn(notificationServiceMock, 'assignUserToPushToken').mockResolvedValueOnce()
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)

            expect(await userAuthTokenService.getNfcUserToken(headers)).toMatchObject(result)
        })
    })

    describe('method: `prolongSession`', () => {
        it('should throw UnauthorizedError when user is not available in cache', async () => {
            const processId = 'processId'
            const { user } = testKit.session.getUserSession()
            const userTokenParams = {
                method: AuthMethod.BankId,
                requestId: 'requestId',
                headers,
                sessionType: SessionType.User,
            }

            jest.spyOn(userAuthStepsAuthDataServiceMock, 'getAuthorizationCacheData').mockResolvedValueOnce(userTokenParams)

            await expect(
                userAuthTokenService.prolongSession(<UserTokenData>user, headers, processId, SessionType.EResident),
            ).rejects.toBeInstanceOf(UnauthorizedError)
        })

        it('should return new token after session prolongation', async () => {
            const processId = 'processId'
            const identifier = 'identifier'
            const token = 'token'

            const prevUserData = {
                refreshToken: {
                    value: 'value',
                    expirationTime: 1000,
                },
            }

            const user = {
                fName: 'firstName',
                lName: 'lastName',
                mName: 'middleName',
                gender: Gender.female,
                itn,
                passport: 'passport',
                document: {
                    value: 'value',
                    type: AuthDocumentType.ForeignPassport,
                },
                birthDay: '01.01.1990',
                refreshToken: {
                    value: 'value',
                    expirationTime: 1000,
                },
            }

            const data = { user, method: AuthMethod.Nfc }

            const authEntryPoint = {
                target: 'target',
                isBankId: true,
                bankName: 'bankName',
                document: AuthDocumentType.ForeignPassport,
            }

            const newRefreshToken = {
                value: 'newValue',
                expirationTime: 2000,
            }

            jest.spyOn(userAuthStepsAuthDataServiceMock, 'getAuthorizationCacheData').mockResolvedValueOnce(data)
            jest.spyOn(authTokenServiceMock, 'checkForValidItn').mockReturnValueOnce()
            jest.spyOn(utilsMock, 'getAuthEntryPoint').mockReturnValueOnce(authEntryPoint)
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(identifier)
            jest.spyOn(customRefreshTokenExpirationServiceMock, 'getByPlatformTypeAndAppVersion').mockResolvedValueOnce(1000)
            jest.spyOn(refreshTokenServiceMock, 'refresh').mockResolvedValueOnce(newRefreshToken)
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)
            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()

            expect(await userAuthTokenService.prolongSession(<UserTokenData>prevUserData, headers, processId, SessionType.EResident)).toBe(
                token,
            )
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Refreshing token', {
                userIdentifier: identifier,
                sessionType: SessionType.EResident,
            })
        })
    })

    describe('method: `refreshUserToken`', () => {
        it('should return refreshed user token', async () => {
            const user = {
                fName: 'firstName',
                lName: 'lastName',
                mName: 'middleName',
                gender: Gender.female,
                identifier: 'identifier',
                sessionType: SessionType.EResident,
                itn,
                passport: 'passport',
                document: {
                    value: 'value',
                    type: AuthDocumentType.ForeignPassport,
                },
                birthDay: '01.01.1990',
            }

            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const newRefreshToken = { ...refreshToken, value: 'new-value' }

            const token = 'token'

            jest.spyOn(refreshTokenServiceMock, 'refresh').mockResolvedValueOnce(newRefreshToken)
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)
            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()

            expect(await userAuthTokenService.refreshUserToken(<AuthUser>user, refreshToken, headers)).toBe(token)
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Refreshing token', {
                userIdentifier: user.identifier,
                sessionType: user.sessionType,
            })
        })
    })

    describe('method: `refreshServiceEntranceToken`', () => {
        it('should return refreshed service entrance token', async () => {
            const user = {
                refreshToken: {
                    value: 'value',
                    expirationTime: 1000,
                },
                identifier: 'identifier',
                sessionType: SessionType.ServiceEntrance,
                acquirerId: new ObjectId(),
                branchHashId: 'branchHashId',
                offerHashId: 'offerHashId',
                offerRequestHashId: 'offerRequestHashId',
                mobileUid: headers.mobileUid,
                document: {
                    value: 'value',
                    type: AuthDocumentType.ForeignPassport,
                },
                email: 'email',
            }

            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const newRefreshToken = { ...refreshToken, value: 'new-value' }

            const token = 'token'

            jest.spyOn(refreshTokenServiceMock, 'refresh').mockResolvedValueOnce(newRefreshToken)
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)
            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()

            expect(await userAuthTokenService.refreshServiceEntranceToken(<ServiceEntranceTokenData>user, refreshToken)).toBe(token)
        })
    })

    describe('method: `refreshServiceUserToken`', () => {
        it('should return refreshed service user token', async () => {
            const user = {
                refreshToken: {
                    value: 'value',
                    expirationTime: 1000,
                },
                identifier: 'identifier',
                sessionType: SessionType.ServiceUser,
                login: 'login',
                mobileUid: headers.mobileUid,
            }

            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const newRefreshToken = { ...refreshToken, value: 'new-value' }

            const token = 'token'

            jest.spyOn(refreshTokenServiceMock, 'refresh').mockResolvedValueOnce(newRefreshToken)
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)
            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()

            expect(await userAuthTokenService.refreshServiceUserToken(<ServiceUserTokenData>user, refreshToken)).toBe(token)
        })
    })

    describe('method: `getTemporaryToken`', () => {
        it('should return temporary token', async () => {
            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const token = 'token'

            const params = {
                temporaryTokenSignOptions: {
                    algorithm: 'signAlgorithm',
                    expiresIn: '1m',
                    audience: 'audience',
                    issuer: 'issuer',
                    jwtid: headers.mobileUid,
                },
                jwt: {
                    tokenSignOptions: {
                        algorithm: 'signAlgorithm',
                        expiresIn: '1m',
                        audience: 'audience',
                        issuer: 'issuer',
                        jwtid: headers.mobileUid,
                    },
                },
            }

            jest.spyOn(refreshTokenServiceMock, 'create').mockResolvedValueOnce(refreshToken)
            jest.spyOn(authCryptoServiceMock, 'newInstance').mockReturnValueOnce(authCryptoServiceMock)
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)
            jest.spyOn(nfcServiceMock, 'saveNfcVerificationRequest').mockResolvedValueOnce()

            expect(await userAuthTokenService.getTemporaryToken(headers)).toBe(token)
            expect(authCryptoServiceMock.newInstance).toHaveBeenCalledWith(params, loggerServiceMock)
        })
    })

    describe('method: `getServiceEntranceToken`', () => {
        it('should throw UnauthorizedError if service entrance data not found', async () => {
            const err = new Error('failed to fetch data')
            const otp = 'otp'
            const traceId = 'traceId'

            jest.spyOn(documentAcquirersServiceMock, 'getServiceEntranceDataByOtp').mockRejectedValueOnce(err)

            const errorMsg = 'Offer request not found by the provided otp'

            await expect(async () => {
                await userAuthTokenService.getServiceEntranceToken(otp, headers.mobileUid, traceId)
            }).rejects.toEqual(new UnauthorizedError(errorMsg))
            expect(loggerServiceMock.error).toHaveBeenCalledWith(errorMsg, { err })
        })

        it('should throw UnauthorizedError if offer request expired', async () => {
            const otp = 'otp'
            const traceId = 'traceId'

            const serviceEntranceData = {
                offerRequestExpiration: 0,
            }

            jest.spyOn(documentAcquirersServiceMock, 'getServiceEntranceDataByOtp').mockResolvedValueOnce(
                <GetServiceEntranceDataByOtpResult>serviceEntranceData,
            )

            await expect(async () => {
                await userAuthTokenService.getServiceEntranceToken(otp, headers.mobileUid, traceId)
            }).rejects.toEqual(new UnauthorizedError('Offer request is expired'))
        })

        it('should return token', async () => {
            const currentTime = Date.now()

            Date.now = jest.fn(() => currentTime)

            const otp = 'otp'
            const traceId = 'traceId'
            const token = 'token'

            const serviceEntranceData = {
                offerRequestExpiration: currentTime + 1,
                acquirerId: new ObjectId(),
                branchHashId: 'branchHashId',
                offerHashId: 'offerHashId',
                offerRequestHashId: 'offerRequestHashId',
            }

            const refreshToken = {
                value: 'value',
                expirationTime: 1000,
            }

            const tokenData: ServiceEntranceTokenData = {
                acquirerId: serviceEntranceData.acquirerId,
                branchHashId: serviceEntranceData.branchHashId,
                offerHashId: serviceEntranceData.offerHashId,
                offerRequestHashId: serviceEntranceData.offerRequestHashId,
                mobileUid: headers.mobileUid,
                refreshToken,
                sessionType: SessionType.ServiceEntrance,
            }

            jest.spyOn(documentAcquirersServiceMock, 'getServiceEntranceDataByOtp').mockResolvedValueOnce(
                <GetServiceEntranceDataByOtpResult>serviceEntranceData,
            )
            jest.spyOn(refreshTokenServiceMock, 'create').mockResolvedValueOnce(refreshToken)
            jest.spyOn(authCryptoServiceMock, 'getJweInJwt').mockResolvedValueOnce(token)

            expect(await userAuthTokenService.getServiceEntranceToken(otp, headers.mobileUid, traceId)).toBe(token)
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Service entrance refresh token lifetime', {
                refreshTokenLifeTime: 1,
            })
            expect(authCryptoServiceMock.getJweInJwt).toHaveBeenCalledWith(tokenData)
        })
    })
})
