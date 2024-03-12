import { AuthService, IdentifierService } from '@diia-inhouse/crypto'
import { BankIdCryptoServiceClient } from '@diia-inhouse/diia-crypto-client'
import { AccessDeniedError } from '@diia-inhouse/errors'
import { AuthEntryPoint, HttpStatusCode, RefreshToken, SessionType, UserSession } from '@diia-inhouse/types'

import ProlongSessionAction from '@actions/v1/prolongSession'
import VerifyAuthMethodAction from '@actions/v1/verifyAuthMethod'
import AuthUrlAction from '@actions/v3/authUrl'
import EResidentGetTokenAction from '@actions/v3/eresident/getEResidentToken'
import GetAuthMethodsAction from '@actions/v3/getAuthMethods'
import GetTokenAction from '@actions/v3/getToken'

import DocumentsService from '@services/documents'
import NotificationService from '@services/notification'
import RefreshTokenService from '@services/refreshToken'
import UserService from '@services/user'

import userAuthStepsModel from '@models/userAuthSteps'

import { generateItn } from '@mocks/randomData'
import UserAuthStepsServiceMock from '@mocks/services/userAuthSteps'

import Helpers from '@tests/helpers'
import { AuthMockProvider } from '@tests/interfaces/mocks/services/authMethods'
import AuthMethodMockFactory from '@tests/mocks/services/authMethods'
import UserSessionGenerator from '@tests/mocks/userSession'
import { getApp } from '@tests/utils/getApp'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { GenderAsSex } from '@interfaces/services/authMethods'
import { BankIdUser } from '@interfaces/services/authMethods/bankId'
import { EResidencyCountryInfo } from '@interfaces/services/documents'

describe(`Action ${VerifyAuthMethodAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let identifierService: IdentifierService
    let userSessionGenerator: UserSessionGenerator

    let prolongSessionAction: ProlongSessionAction
    let verifyAuthMethodAction: VerifyAuthMethodAction
    let authUrlAction: AuthUrlAction
    let eResidentGetTokenAction: EResidentGetTokenAction
    let getAuthMethodsAction: GetAuthMethodsAction
    let getTokenAction: GetTokenAction

    let documentsService: DocumentsService
    let notificationService: NotificationService
    let refreshTokenService: RefreshTokenService
    let userService: UserService
    let auth: AuthService
    let bankIdCryptoServiceClient: BankIdCryptoServiceClient

    let authMethodMockFactory: AuthMethodMockFactory
    let userAuthStepsServiceMock: UserAuthStepsServiceMock

    beforeAll(async () => {
        app = await getApp()
        identifierService = app.container.resolve('identifier')
        userSessionGenerator = new UserSessionGenerator(identifierService)
        prolongSessionAction = app.container.build(ProlongSessionAction)
        verifyAuthMethodAction = app.container.build(VerifyAuthMethodAction)
        authUrlAction = app.container.build(AuthUrlAction)
        eResidentGetTokenAction = app.container.build(EResidentGetTokenAction)
        getAuthMethodsAction = app.container.build(GetAuthMethodsAction)
        getTokenAction = app.container.build(GetTokenAction)
        documentsService = app.container.resolve('documentsService')
        notificationService = app.container.resolve('notificationService')
        refreshTokenService = app.container.resolve('refreshTokenService')
        userService = app.container.resolve('userService')
        auth = app.container.resolve('auth')
        bankIdCryptoServiceClient = app.container.resolve('bankIdCryptoServiceClient')
        authMethodMockFactory = new AuthMethodMockFactory(app)
        userAuthStepsServiceMock = new UserAuthStepsServiceMock(app)

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    const bankMethods: AuthMethod[] = [AuthMethod.BankId, AuthMethod.Monobank, AuthMethod.PrivatBank]

    describe(`Auth schema ${AuthSchemaCode.Authorization}`, () => {
        const code: AuthSchemaCode = AuthSchemaCode.Authorization

        it('should finish user auth steps successfully with internet-banking', async () => {
            const headers = userSessionGenerator.getHeaders()

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })
            const bankMethod = initialMethods.find((item: AuthMethod) => bankMethods.includes(item))

            jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert: 'cert' })
            Helpers.assertNotToBeUndefined(bankMethod)

            const bankProvider = authMethodMockFactory.getAuthProvider(bankMethod)

            await bankProvider.requestAuthorizationUrl()
            await authUrlAction.handler({
                params: { processId, target: bankMethod, ...bankProvider.getSpecificParams() },
                headers,
            })
            const mockBankIdUser: BankIdUser = {
                type: 'individual',
                firstName: 'John',
                middleName: 'Quincy',
                lastName: 'Doe',
                phone: '+1234567890',
                inn: '123456789012',
                birthDay: '1980-01-01',
                sex: GenderAsSex.M,
                email: 'john.doe@example.com',
                addresses: [],
                documents: [],
            }

            jest.spyOn(bankIdCryptoServiceClient, 'decrypt').mockResolvedValueOnce({ data: JSON.stringify(mockBankIdUser) })
            await bankProvider.getUserData({ headers })
            const { processCode: bankProcessCode } = await verifyAuthMethodAction.handler({
                params: { method: bankMethod, requestId: 'request-id', processId, ...bankProvider.getSpecificParams() },
                headers,
            })

            expect(bankProcessCode).toEqual(ProcessCode.AuthBankSuccessWithoutPhoto)

            jest.spyOn(notificationService, 'assignUserToPushToken').mockImplementationOnce(async () => {})
            jest.spyOn(userService, 'createOrUpdateProfile').mockImplementationOnce(async () => {})
            const { token, channelUuid } = await getTokenAction.handler({ params: { processId }, headers })

            expect(token).toEqual(expect.any(String))
            expect(channelUuid).toEqual(expect.any(String))
        })

        it('should fail to verify step if step ttl expired', async () => {
            const headers = userSessionGenerator.getHeaders()

            const { processId, authMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })

            const authMethod: AuthMethod = authMethods[0]
            const authProvider: AuthMockProvider = authMethodMockFactory.getAuthProvider(authMethod)

            await authProvider.requestAuthorizationUrl()
            await authUrlAction.handler({
                params: { processId, target: authMethod, ...authProvider.getSpecificParams() },
                headers,
            })

            const userAuthSteps = await userAuthStepsModel.findOne({ processId })

            userAuthSteps!.steps![userAuthSteps!.steps!.length - 1].startDate = new Date(Date.now() - 1000 * 60 * 60)
            await userAuthSteps!.save()

            await expect(
                verifyAuthMethodAction.handler({
                    params: { method: AuthMethod.Monobank, requestId: 'request-id', processId, ...authProvider.getSpecificParams() },
                    headers,
                }),
            ).rejects.toThrow(new AccessDeniedError('', {}, ProcessCode.WaitingPeriodHasExpired))
        })

        it.each([
            [
                'method is not expected',
                async (processId: string): Promise<void> => {
                    const userAuthSteps = await userAuthStepsModel.findOne({ processId })

                    userAuthSteps!.steps![userAuthSteps!.steps!.length - 1].startDate = new Date()
                    userAuthSteps!.steps![userAuthSteps!.steps!.length - 1].attempts = 4
                    await userAuthSteps!.save()
                },
                new AccessDeniedError('', {}, ProcessCode.WaitingPeriodHasExpired),
                AuthMethod.EmailOtp,
            ],
            [
                'step ttl expired',
                async (processId: string): Promise<void> => {
                    const userAuthSteps = await userAuthStepsModel.findOne({ processId })

                    userAuthSteps!.steps![userAuthSteps!.steps!.length - 1].startDate = new Date(Date.now() - 1000 * 60 * 60)
                    await userAuthSteps!.save()
                },
                new AccessDeniedError('', {}, ProcessCode.WaitingPeriodHasExpired),
                AuthMethod.BankId,
            ],
            [
                'auth attempts are exceeded',
                async (processId: string): Promise<void> => {
                    const userAuthSteps = await userAuthStepsModel.findOne({ processId })

                    userAuthSteps!.steps![userAuthSteps!.steps!.length - 1].startDate = new Date()
                    userAuthSteps!.steps![userAuthSteps!.steps!.length - 1].attempts = 4
                    await userAuthSteps!.save()
                },
                new AccessDeniedError('', {}, ProcessCode.AuthAttemptsExceeded),
                AuthMethod.BankId,
            ],
            [
                'is already ended',
                async (processId: string): Promise<void> => {
                    const userAuthSteps = await userAuthStepsModel.findOne({ processId })

                    userAuthSteps!.steps![userAuthSteps!.steps!.length - 1].startDate = new Date()
                    userAuthSteps!.steps![userAuthSteps!.steps!.length - 1].endDate = new Date()
                    await userAuthSteps!.save()
                },
                new AccessDeniedError('', {}, ProcessCode.WaitingPeriodHasExpired),
                AuthMethod.BankId,
            ],
        ])('should fail to verify step if %s', async (_msg, prepareUserAuthSteps: CallableFunction, expectedError, method: AuthMethod) => {
            const headers = userSessionGenerator.getHeaders()

            const { processId, authMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })

            const authMethod: AuthMethod = authMethods[0]
            const authProvider: AuthMockProvider = authMethodMockFactory.getAuthProvider(authMethod)

            await authProvider.requestAuthorizationUrl()
            await authUrlAction.handler({
                params: { processId, target: authMethod, ...authProvider.getSpecificParams() },
                headers,
            })

            await prepareUserAuthSteps(processId)

            await expect(
                verifyAuthMethodAction.handler({
                    params: { method, requestId: 'request-id', processId, ...authProvider.getSpecificParams() },
                    headers,
                }),
            ).rejects.toThrow(expectedError)
        })

        it('should fail to verify step if verification strategy internal error occurred', async () => {
            const headers = userSessionGenerator.getHeaders()

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })
            const bankMethod = initialMethods.find((item: AuthMethod) => bankMethods.includes(item))

            // expect.assertions(2)
            Helpers.assertNotToBeUndefined(bankMethod)

            const bankProvider = authMethodMockFactory.getAuthProvider(bankMethod)

            await bankProvider.requestAuthorizationUrl()
            await authUrlAction.handler({
                params: { processId, target: bankMethod, ...bankProvider.getSpecificParams() },
                headers,
            })

            await bankProvider.getUserData({ statusCode: HttpStatusCode.UNAUTHORIZED })

            await expect(
                verifyAuthMethodAction.handler({
                    params: { method: bankMethod, requestId: 'request-id', processId, ...bankProvider.getSpecificParams() },
                    headers,
                }),
            ).rejects.toThrow(new AccessDeniedError('Failed to verify step', {}, ProcessCode.AuthFailed))
        })
    })

    describe(`Auth schema ${AuthSchemaCode.DiiaIdCreation}`, () => {
        it('should finished successfully', async () => {
            const result = await userAuthStepsServiceMock.finishDiiaIdCreationSteps()

            expect(result).toEqual(expect.any(String))
        })
    })

    describe(`Auth schema ${AuthSchemaCode.DiiaIdSigning}`, () => {
        const code: AuthSchemaCode = AuthSchemaCode.DiiaIdSigning

        it('should finished successfully', async () => {
            const headers = userSessionGenerator.getHeaders()
            const session = userSessionGenerator.getUserSession()

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({
                params: { code },
                headers,
                session,
            })
            const photoIdMethod = initialMethods.find((item: AuthMethod) => item === AuthMethod.PhotoId)

            Helpers.assertNotToBeUndefined(photoIdMethod)

            const photoIdProvider = authMethodMockFactory.getAuthProvider(photoIdMethod)

            await photoIdProvider.requestAuthorizationUrl()
            const { authUrl } = await authUrlAction.handler({ params: { processId, target: photoIdMethod }, headers, session })

            const requestId: string = Helpers.extractAuthUrlRequestId(authUrl)

            await photoIdProvider.getUserData({ requestId })
            const { processCode } = await verifyAuthMethodAction.handler({
                params: { method: photoIdMethod, requestId, processId },
                headers,
                session,
            })

            expect(processCode).toEqual(ProcessCode.DiiaIdSigningPhotoIdSuccess)
        })
    })

    describe(`Auth schema ${AuthSchemaCode.Prolong}`, () => {
        const code: AuthSchemaCode = AuthSchemaCode.Prolong

        it('should finished successfully when passports exist', async () => {
            const headers = userSessionGenerator.getHeaders()
            const itn: string = generateItn()
            const userIdentifier: string = identifierService.createIdentifier(itn)
            const authEntryPoint: AuthEntryPoint = userSessionGenerator.getAuthEntryPoint()

            const { traceId, mobileUid } = headers

            const refreshToken: RefreshToken = await refreshTokenService.create(
                traceId,
                SessionType.User,
                { userIdentifier, mobileUid, authEntryPoint },
                headers,
            )
            const session: UserSession = userSessionGenerator.getUserSession({
                itn,
                identifier: userIdentifier,
                authEntryPoint,
                refreshToken,
                mobileUid,
                sessionType: SessionType.User,
            })

            headers.token = await auth.getJweInJwt({ ...session, refreshToken }, '2h')

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({
                params: { code },
                headers,
                session,
            })
            const bankMethod = initialMethods.find((item: AuthMethod) => bankMethods.includes(item))

            Helpers.assertNotToBeUndefined(bankMethod)

            const bankProvider = authMethodMockFactory.getAuthProvider(bankMethod)

            await bankProvider.requestAuthorizationUrl()
            await authUrlAction.handler({
                params: { processId, target: bankMethod, ...bankProvider.getSpecificParams() },
                headers,
                session,
            })

            await bankProvider.getUserData({ itn })
            const hasOneOfDocuments: jest.SpyInstance = jest
                .spyOn(userService, 'hasOneOfDocuments')
                .mockImplementationOnce(async () => true)

            jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert: 'cert' })
            const mockBankIdUser: BankIdUser = {
                type: 'individual',
                firstName: 'John',
                middleName: 'Quincy',
                lastName: 'Doe',
                phone: '+1234567890',
                inn: itn,
                birthDay: '1980-01-01',
                sex: GenderAsSex.M,
                email: 'john.doe@example.com',
                addresses: [],
                documents: [],
            }

            jest.spyOn(bankIdCryptoServiceClient, 'decrypt').mockResolvedValueOnce({ data: JSON.stringify(mockBankIdUser) })
            await verifyAuthMethodAction.handler({
                params: { method: bankMethod, requestId: 'request-id', processId, ...bankProvider.getSpecificParams() },
                headers,
                session,
            })
            expect(hasOneOfDocuments).toHaveBeenCalledTimes(1)

            const { authMethods = [] } = await getAuthMethodsAction.handler({ params: { code, processId }, headers, session })
            const photoIdMethod = authMethods.find((method: AuthMethod) => method === AuthMethod.PhotoId)

            Helpers.assertNotToBeUndefined(photoIdMethod)

            const photoIdProvider: AuthMockProvider = authMethodMockFactory.getAuthProvider(photoIdMethod)

            await photoIdProvider.requestAuthorizationUrl()
            const { authUrl: photoIdAuthUrl } = await authUrlAction.handler({
                params: { processId, target: photoIdMethod },
                headers,
                session,
            })

            const photoIdRequestId: string = Helpers.extractAuthUrlRequestId(photoIdAuthUrl)

            await photoIdProvider.getUserData({ requestId: photoIdRequestId })
            await verifyAuthMethodAction.handler({
                params: { method: photoIdMethod, requestId: photoIdRequestId, processId },
                headers,
                session,
            })

            const { token } = await prolongSessionAction.handler({ params: { processId }, headers, session })

            expect(token).toEqual(expect.any(String))

            const authSteps = await userAuthStepsModel.findOne({ processId })

            expect(authSteps!.status).toEqual(UserAuthStepsStatus.Completed)
        })
    })

    describe(`Auth schema ${AuthSchemaCode.EResidentAuth}`, () => {
        const code: AuthSchemaCode = AuthSchemaCode.EResidentAuth

        describe(`Auth method ${AuthMethod.EResidentMrz}`, () => {
            const authMethod = AuthMethod.EResidentMrz
            const successProcessCode = ProcessCode.EResidentMrzSuccess
            const failProcessCode = ProcessCode.EResidentAuthFail

            it(`should finish user auth steps successfully and return ${successProcessCode} process code`, async () => {
                const methodProvider = authMethodMockFactory.getAuthProvider(authMethod)
                const headers = userSessionGenerator.getHeaders()

                const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({
                    params: { code },
                    headers,
                })

                expect(initialMethods).toContain(authMethod)

                const { authUrl } = await authUrlAction.handler({
                    params: { processId, target: authMethod },
                    headers,
                })

                methodProvider.getUserData()
                jest.spyOn(documentsService, 'getEResidentCountriesInfo').mockResolvedValueOnce([
                    <EResidencyCountryInfo>{ alpha3: 'SVK', isCountryResidence: true },
                ])

                const { processCode } = await verifyAuthMethodAction.handler({
                    params: { method: authMethod, requestId: authUrl, processId, ...methodProvider.getSpecificParams() },
                    headers,
                })

                expect(processCode).toEqual(successProcessCode)

                const { authMethods = [] } = await getAuthMethodsAction.handler({ params: { code, processId }, headers })
                const photoIdMethod = <AuthMethod>authMethods.find((item: AuthMethod) => item === AuthMethod.PhotoId)
                const photoIdProvider: AuthMockProvider = authMethodMockFactory.getAuthProvider(photoIdMethod)

                await photoIdProvider.requestAuthorizationUrl()

                const requestedUrl = await authUrlAction.handler({ params: { processId, target: photoIdMethod }, headers })
                const requestId: string = Helpers.extractAuthUrlRequestId(requestedUrl.authUrl)

                await photoIdProvider.getUserData({ requestId })

                const { processCode: photoIdProcessCode } = await verifyAuthMethodAction.handler({
                    params: { method: photoIdMethod, requestId, processId },
                    headers,
                })

                expect(photoIdProcessCode).toEqual(ProcessCode.EResidentPhotoIdSuccess)

                jest.spyOn(notificationService, 'assignUserToPushToken').mockImplementationOnce(async () => {})
                jest.spyOn(userService, 'createOrUpdateProfile').mockImplementationOnce(async () => {})
                methodProvider.getUserData()
                const { token, channelUuid } = await eResidentGetTokenAction.handler({ params: { processId }, headers })

                expect(token).toEqual(expect.any(String))
                expect(channelUuid).toEqual(expect.any(String))
            })

            it(`should fail and return ${failProcessCode} process code in case mrz payload was not provided`, async () => {
                const headers = userSessionGenerator.getHeaders()

                const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({
                    params: { code },
                    headers,
                })

                expect(initialMethods).toContain(authMethod)

                const { authUrl } = await authUrlAction.handler({
                    params: { processId, target: authMethod },
                    headers,
                })

                const expectedError = new AccessDeniedError('Failed to verify step', {}, failProcessCode)

                await expect(
                    verifyAuthMethodAction.handler({
                        params: { method: authMethod, requestId: authUrl, processId },
                        headers,
                    }),
                ).rejects.toEqual(expectedError)
            })

            it.each([
                ['is not present in countries list', 'FF', [<EResidencyCountryInfo>{ alpha3: 'SVK', isCountryResidence: true }]],
                ['is not allowed as residence country', 'SVK', [<EResidencyCountryInfo>{ alpha3: 'SVK', isCountryResidence: false }]],
                [
                    'is not allowed as residence country when isCountryResidence is undefined',
                    'SVK',
                    [<EResidencyCountryInfo>{ alpha3: 'SVK' }],
                ],
            ])(
                `should fail and return ${failProcessCode} process code in case mrz payload contains residency country which %s`,
                async (_msg, inputResidenceCountry, countriesList) => {
                    const headers = userSessionGenerator.getHeaders()

                    const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({
                        params: { code },
                        headers,
                    })

                    expect(initialMethods).toContain(authMethod)

                    const { authUrl } = await authUrlAction.handler({
                        params: { processId, target: authMethod },
                        headers,
                    })

                    const expectedError = new AccessDeniedError('Failed to verify step', {}, failProcessCode)

                    jest.spyOn(documentsService, 'getEResidentCountriesInfo').mockResolvedValueOnce(countriesList)

                    await expect(
                        verifyAuthMethodAction.handler({
                            params: {
                                method: authMethod,
                                requestId: authUrl,
                                processId,
                                mrzPayload: { docNumber: 'number', residenceCountry: inputResidenceCountry },
                            },
                            headers,
                        }),
                    ).rejects.toEqual(expectedError)
                },
            )

            it(`should fail and return ${failProcessCode} process code in case provided requestId invalid`, async () => {
                const methodProvider = authMethodMockFactory.getAuthProvider(authMethod)
                const headers = userSessionGenerator.getHeaders()

                const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({
                    params: { code },
                    headers,
                })

                expect(initialMethods).toContain(authMethod)

                await authUrlAction.handler({
                    params: { processId, target: authMethod },
                    headers,
                })

                const expectedError = new AccessDeniedError('Failed to verify step', {}, failProcessCode)

                jest.spyOn(documentsService, 'getEResidentCountriesInfo').mockResolvedValueOnce([
                    <EResidencyCountryInfo>{ alpha3: 'SVK', isCountryResidence: true },
                ])

                await expect(
                    verifyAuthMethodAction.handler({
                        params: {
                            method: authMethod,
                            requestId: 'wrong-request-id',
                            processId,
                            ...methodProvider.getSpecificParams(),
                        },
                        headers,
                    }),
                ).rejects.toEqual(expectedError)
            })

            it(`should fail and return ${failProcessCode} process code in case is not able to fetch residency data`, async () => {
                const methodProvider = authMethodMockFactory.getAuthProvider(authMethod)
                const headers = userSessionGenerator.getHeaders()

                const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({
                    params: { code },
                    headers,
                })

                expect(initialMethods).toContain(authMethod)

                const { authUrl } = await authUrlAction.handler({
                    params: { processId, target: authMethod },
                    headers,
                })

                jest.spyOn(documentsService, 'getEResidentCountriesInfo').mockResolvedValueOnce([
                    <EResidencyCountryInfo>{ alpha3: 'SVK', isCountryResidence: true },
                ])
                jest.spyOn(documentsService, 'getEResidencyToProcess').mockImplementationOnce(async () => {
                    throw new Error('Unable to fetch e-residency')
                })

                const expectedError = new AccessDeniedError('Failed to verify step', {}, failProcessCode)

                await expect(
                    verifyAuthMethodAction.handler({
                        params: {
                            method: authMethod,
                            requestId: authUrl,
                            processId,
                            ...methodProvider.getSpecificParams(),
                        },
                        headers,
                    }),
                ).rejects.toEqual(expectedError)
            })
        })
    })

    describe(`Auth schema ${AuthSchemaCode.EResidentApplicantAuth}`, () => {
        const code: AuthSchemaCode = AuthSchemaCode.EResidentApplicantAuth
        const emailOtpMethod: AuthMethod = AuthMethod.EmailOtp
        const allowedMethods: AuthMethod[] = [AuthMethod.EmailOtp]

        it(`should finish user auth steps successfully with ${emailOtpMethod}`, async () => {
            const emailOtpProvider = authMethodMockFactory.getAuthProvider(emailOtpMethod)
            const { mobileUid, otp, email } = emailOtpProvider.getSpecificParams()
            const headers = {
                ...userSessionGenerator.getHeaders(),
                mobileUid,
            }

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })

            expect(initialMethods).toEqual(allowedMethods)

            const { authUrl } = await authUrlAction.handler({
                params: { processId, target: emailOtpMethod, email },
                headers,
            })
            const { processCode: emailOtpProcessCode } = await verifyAuthMethodAction.handler({
                params: { method: emailOtpMethod, requestId: authUrl, processId, otp },
                headers,
            })

            expect(emailOtpProcessCode).toEqual(ProcessCode.EResidentApplicantOtpSuccess)

            jest.spyOn(notificationService, 'assignUserToPushToken').mockImplementationOnce(async () => {})
            jest.spyOn(userService, 'createOrUpdateProfile').mockImplementationOnce(async () => {})
            const { token, channelUuid } = await eResidentGetTokenAction.handler({ params: { processId }, headers })

            expect(token).toEqual(expect.any(String))
            expect(channelUuid).toEqual(expect.any(String))
        })

        it(`should finish user auth steps successfully with ${emailOtpMethod} after 1 failed attempt`, async () => {
            const emailOtpProvider = authMethodMockFactory.getAuthProvider(emailOtpMethod)
            const { mobileUid, otp, email } = emailOtpProvider.getSpecificParams()
            const headers = {
                ...userSessionGenerator.getHeaders(),
                mobileUid,
            }

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })

            expect(initialMethods).toEqual(allowedMethods)

            const { authUrl } = await authUrlAction.handler({
                params: { processId, target: emailOtpMethod, email },
                headers,
            })
            const expectedError = new AccessDeniedError('Failed to verify step', {}, ProcessCode.EResidentApplicantAuthOtpFail)

            await expect(
                verifyAuthMethodAction.handler({
                    params: { method: emailOtpMethod, requestId: authUrl, processId, otp: 'wrong-otp' },
                    headers,
                }),
            ).rejects.toEqual(expectedError)

            const { processCode: emailOtpProcessCode } = await verifyAuthMethodAction.handler({
                params: { method: emailOtpMethod, requestId: authUrl, processId, otp },
                headers,
            })

            expect(emailOtpProcessCode).toEqual(ProcessCode.EResidentApplicantOtpSuccess)

            jest.spyOn(notificationService, 'assignUserToPushToken').mockImplementationOnce(async () => {})
            jest.spyOn(userService, 'createOrUpdateProfile').mockImplementationOnce(async () => {})
            const { token, channelUuid } = await eResidentGetTokenAction.handler({ params: { processId }, headers })

            expect(token).toEqual(expect.any(String))
            expect(channelUuid).toEqual(expect.any(String))
        })

        it(`should throw error with verification failed process code in case invalid otp was provided for ${emailOtpMethod} method`, async () => {
            const invalidOtp = 'wrong-otp'
            const emailOtpProvider = authMethodMockFactory.getAuthProvider(emailOtpMethod)
            const { mobileUid, email } = emailOtpProvider.getSpecificParams()
            const headers = {
                ...userSessionGenerator.getHeaders(),
                mobileUid,
            }

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })

            expect(initialMethods).toEqual(allowedMethods)

            const { authUrl } = await authUrlAction.handler({
                params: { processId, target: emailOtpMethod, email },
                headers,
            })

            const expectedError = new AccessDeniedError('Failed to verify step', {}, ProcessCode.EResidentApplicantAuthOtpFail)

            await expect(
                verifyAuthMethodAction.handler({
                    params: { method: emailOtpMethod, requestId: authUrl, processId, otp: invalidOtp },
                    headers,
                }),
            ).rejects.toEqual(expectedError)
        })

        it(`should throw error with verification failed process code in case expired otp was provided for ${emailOtpMethod} method`, async () => {
            const emailOtpProvider = authMethodMockFactory.getAuthProvider(emailOtpMethod)
            const { mobileUid, email, otp } = emailOtpProvider.getSpecificParams()
            const headers = {
                ...userSessionGenerator.getHeaders(),
                mobileUid,
            }

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })

            expect(initialMethods).toEqual(allowedMethods)

            const { authUrl } = await authUrlAction.handler({
                params: { processId, target: emailOtpMethod, email },
                headers,
            })

            await emailOtpProvider.requestAuthorizationUrl()

            const expectedError = new AccessDeniedError('Failed to verify step', {}, ProcessCode.EResidentApplicantAuthOtpFail)

            await expect(
                verifyAuthMethodAction.handler({
                    params: { method: emailOtpMethod, requestId: authUrl, processId, otp },
                    headers,
                }),
            ).rejects.toEqual(expectedError)
        })

        it(`should throw error with verification failed process code in case invalid request id was provided for ${emailOtpMethod} method`, async () => {
            const emailOtpProvider = authMethodMockFactory.getAuthProvider(emailOtpMethod)
            const { mobileUid, email, otp } = emailOtpProvider.getSpecificParams()
            const headers = {
                ...userSessionGenerator.getHeaders(),
                mobileUid,
            }

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })

            expect(initialMethods).toEqual(allowedMethods)

            const { authUrl } = await authUrlAction.handler({
                params: { processId, target: emailOtpMethod, email },
                headers,
            })

            const expectedError = new AccessDeniedError('Failed to verify step', {}, ProcessCode.EResidentApplicantAuthOtpFail)

            await expect(
                verifyAuthMethodAction.handler({
                    params: { method: emailOtpMethod, requestId: `${authUrl}-invalid`, processId, otp },
                    headers,
                }),
            ).rejects.toEqual(expectedError)
        })

        it(`should throw error with verification attempts exceeded process code in case invalid otp was provided for ${emailOtpMethod} method 3 times`, async () => {
            const invalidOtp = 'wrong-otp'
            const emailOtpProvider = authMethodMockFactory.getAuthProvider(emailOtpMethod)
            const { mobileUid, email } = emailOtpProvider.getSpecificParams()
            const headers = {
                ...userSessionGenerator.getHeaders(),
                mobileUid,
            }

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })

            expect(initialMethods).toEqual(allowedMethods)

            const { authUrl } = await authUrlAction.handler({
                params: { processId, target: emailOtpMethod, email },
                headers,
            })

            const expectedOtpFailError = new AccessDeniedError('Failed to verify step', {}, ProcessCode.EResidentApplicantAuthOtpFail)
            const expectedAttemptsExceededError = new AccessDeniedError('Forbidden', {}, ProcessCode.VerifyAttemptsExceeded)
            const verifyParams = { method: emailOtpMethod, requestId: authUrl, processId, otp: invalidOtp }

            await expect(verifyAuthMethodAction.handler({ params: verifyParams, headers })).rejects.toEqual(expectedOtpFailError)
            await expect(verifyAuthMethodAction.handler({ params: verifyParams, headers })).rejects.toEqual(expectedOtpFailError)
            await expect(verifyAuthMethodAction.handler({ params: verifyParams, headers })).rejects.toEqual(expectedAttemptsExceededError)
        })

        it(`should finish user auth steps successfully with ${emailOtpMethod} on 3rd auth attempt`, async () => {
            const emailOtpProvider = authMethodMockFactory.getAuthProvider(emailOtpMethod)
            const { mobileUid, otp, email } = emailOtpProvider.getSpecificParams()
            const headers = { ...userSessionGenerator.getHeaders(), mobileUid }
            const otpFailError = new AccessDeniedError('Failed to verify step', {}, ProcessCode.EResidentApplicantAuthOtpFail)
            const attemptsExceededError = new AccessDeniedError('Forbidden', {}, ProcessCode.VerifyAttemptsExceeded)

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({ params: { code }, headers })
            const authUrlParams = { processId, target: emailOtpMethod, email }

            expect(initialMethods).toEqual(allowedMethods)

            const { authUrl: firstAuthUrl } = await authUrlAction.handler({ params: authUrlParams, headers })
            const firstVerifyParams = { method: emailOtpMethod, requestId: firstAuthUrl, processId, otp: 'wrong-otp' }

            await expect(verifyAuthMethodAction.handler({ params: firstVerifyParams, headers })).rejects.toEqual(otpFailError)
            await expect(verifyAuthMethodAction.handler({ params: firstVerifyParams, headers })).rejects.toEqual(otpFailError)
            await expect(verifyAuthMethodAction.handler({ params: firstVerifyParams, headers })).rejects.toEqual(attemptsExceededError)

            const { authUrl: secondAuthUrl } = await authUrlAction.handler({ params: authUrlParams, headers })
            const secondVerifyParams = { method: emailOtpMethod, requestId: secondAuthUrl, processId, otp: 'wrong-otp' }

            await expect(verifyAuthMethodAction.handler({ params: secondVerifyParams, headers })).rejects.toEqual(otpFailError)
            await expect(verifyAuthMethodAction.handler({ params: secondVerifyParams, headers })).rejects.toEqual(otpFailError)
            await expect(verifyAuthMethodAction.handler({ params: secondVerifyParams, headers })).rejects.toEqual(attemptsExceededError)

            const { authUrl: thirdAuthUrl } = await authUrlAction.handler({ params: authUrlParams, headers })

            await expect(
                verifyAuthMethodAction.handler({
                    params: { method: emailOtpMethod, requestId: thirdAuthUrl, processId, otp: 'wrong-otp' },
                    headers,
                }),
            ).rejects.toEqual(otpFailError)

            const { processCode: emailOtpProcessCode } = await verifyAuthMethodAction.handler({
                params: { method: emailOtpMethod, requestId: thirdAuthUrl, processId, otp },
                headers,
            })

            expect(emailOtpProcessCode).toEqual(ProcessCode.EResidentApplicantOtpSuccess)

            jest.spyOn(notificationService, 'assignUserToPushToken').mockImplementationOnce(async () => {})
            jest.spyOn(userService, 'createOrUpdateProfile').mockImplementationOnce(async () => {})
            const { token, channelUuid } = await eResidentGetTokenAction.handler({ params: { processId }, headers })

            expect(token).toEqual(expect.any(String))
            expect(channelUuid).toEqual(expect.any(String))
        })
    })
})
