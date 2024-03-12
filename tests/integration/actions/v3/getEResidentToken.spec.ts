import { IdentifierService } from '@diia-inhouse/crypto'
import { AccessDeniedError, ModelNotFoundError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import VerifyAuthMethodAction from '@actions/v1/verifyAuthMethod'
import AuthUrlAction from '@actions/v3/authUrl'
import GetEResidentTokenAction from '@actions/v3/eresident/getEResidentToken'
import GetAuthMethodsAction from '@actions/v3/getAuthMethods'

import DocumentsService from '@services/documents'
import NotificationService from '@services/notification'
import UserService from '@services/user'
import UserAuthTokenService from '@services/userAuthToken'

import Helpers from '@tests/helpers'
import { AuthMockProvider } from '@tests/interfaces/mocks/services/authMethods'
import AuthMethodMockFactory from '@tests/mocks/services/authMethods'
import { getApp } from '@tests/utils/getApp'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { EResidencyCountryInfo } from '@interfaces/services/documents'
import { MessageTemplateCode } from '@interfaces/services/notification'

describe(`Action ${GetEResidentTokenAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let documentsService: DocumentsService
    let authUrlAction: AuthUrlAction
    let verifyAuthMethodAction: VerifyAuthMethodAction
    let getEResidentTokenAction: GetEResidentTokenAction
    let getAuthMethodsAction: GetAuthMethodsAction
    let userAuthTokenService: UserAuthTokenService
    let identifier: IdentifierService
    let notificationService: NotificationService
    let userService: UserService
    let testKit: TestKit
    let authMethodMockFactory: AuthMethodMockFactory

    beforeAll(async () => {
        app = await getApp()
        documentsService = app.container.resolve('documentsService')
        authUrlAction = app.container.build(AuthUrlAction)
        verifyAuthMethodAction = app.container.build(VerifyAuthMethodAction)
        getEResidentTokenAction = app.container.build(GetEResidentTokenAction)
        getAuthMethodsAction = app.container.build(GetAuthMethodsAction)
        userAuthTokenService = app.container.resolve('userAuthTokenService')
        identifier = app.container.resolve('identifier')
        notificationService = app.container.resolve('notificationService')
        userService = app.container.resolve('userService')
        testKit = app.container.resolve('testKit')
        authMethodMockFactory = new AuthMethodMockFactory(app)
        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should throw ModelNotFoundError for not existed processId', async () => {
        const headers = testKit.session.getHeaders()

        const params = {
            headers,
            params: {
                processId: 'fakeId',
            },
        }

        await expect(() => getEResidentTokenAction.handler(params)).rejects.toBeInstanceOf(ModelNotFoundError)
    })

    it('should throw AccessDeniedError for authStep with incomplete status', async () => {
        const headers = testKit.session.getHeaders()

        const { processId } = await getAuthMethodsAction.handler({
            params: { code: AuthSchemaCode.EResidentApplicantAuth },
            headers,
        })

        const params = {
            headers,
            params: {
                processId,
            },
        }

        await expect(() => getEResidentTokenAction.handler(params)).rejects.toBeInstanceOf(AccessDeniedError)
    })

    describe(`SessionType '${SessionType.EResident}'`, () => {
        const code = AuthSchemaCode.EResidentAuth
        const sessionType = SessionType.EResident
        const authMethod = AuthMethod.EResidentMrz

        it(`should get token and channelUuid for ${sessionType} `, async () => {
            const headers = testKit.session.getHeaders()

            const { processId, authMethods: initialMethods = [] } = await getAuthMethodsAction.handler({
                params: { code },
                headers,
            })

            expect(initialMethods).toContain(authMethod)

            const methodProvider = authMethodMockFactory.getAuthProvider(authMethod)

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

            expect(processCode).toEqual(ProcessCode.EResidentMrzSuccess)

            const { authMethods = [] } = await getAuthMethodsAction.handler({ params: { code, processId }, headers })

            const photoIdMethod = AuthMethod.PhotoId

            expect(authMethods).toContain(photoIdMethod)

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
            const createIdentifierSpy = jest.spyOn(identifier, 'createIdentifier')
            const sendNotificationSpy = jest.spyOn(userAuthTokenService, 'sendAuthNotification')

            methodProvider.getUserData()
            const { token, channelUuid } = await getEResidentTokenAction.handler({ params: { processId }, headers })

            expect(token).toEqual(expect.any(String))
            expect(channelUuid).toEqual(expect.any(String))
            expect(createIdentifierSpy).toHaveBeenNthCalledWith(1, expect.any(String), { prefix: 'e-resident' })
            expect(sendNotificationSpy).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(String),
                MessageTemplateCode.EResidentNewDeviceConnecting,
            )
        })
    })

    describe(`Session Type: '${SessionType.EResidentApplicant}`, () => {
        const code: AuthSchemaCode = AuthSchemaCode.EResidentApplicantAuth
        const emailOtpMethod: AuthMethod = AuthMethod.EmailOtp
        const allowedMethods: AuthMethod[] = [AuthMethod.EmailOtp]
        const sessionType = SessionType.EResidentApplicant

        it(`should get token and channelUuid for ${sessionType} `, async () => {
            const emailOtpProvider = authMethodMockFactory.getAuthProvider(emailOtpMethod)
            const { mobileUid, otp, email } = emailOtpProvider.getSpecificParams()
            const headers = {
                ...testKit.session.getHeaders(),
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

            const createIdentifierSpy = jest.spyOn(identifier, 'createIdentifier')

            jest.spyOn(notificationService, 'assignUserToPushToken').mockImplementationOnce(async () => {})
            jest.spyOn(userService, 'createOrUpdateProfile').mockImplementationOnce(async () => {})
            const { token, channelUuid } = await getEResidentTokenAction.handler({ params: { processId }, headers })

            expect(token).toEqual(expect.any(String))
            expect(channelUuid).toEqual(expect.any(String))
            expect(createIdentifierSpy).toHaveBeenNthCalledWith(1, expect.any(String), { prefix: 'e-resident-applicant' })
        })
    })
})
