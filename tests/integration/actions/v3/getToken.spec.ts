import { IdentifierService } from '@diia-inhouse/crypto'
import { BankIdCryptoServiceClient } from '@diia-inhouse/diia-crypto-client'
import { AccessDeniedError, ModelNotFoundError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { SessionType, UserSession } from '@diia-inhouse/types'

import VerifyAuthMethodAction from '@actions/v1/verifyAuthMethod'
import AuthUrlAction from '@actions/v3/authUrl'
import GetAuthMethodsAction from '@actions/v3/getAuthMethods'
import GetTokenAction from '@actions/v3/getToken'

import NotificationService from '@services/notification'
import UserService from '@services/user'
import UserAuthTokenService from '@services/userAuthToken'

import Helpers from '@tests/helpers'
import AuthMethodMockFactory from '@tests/mocks/services/authMethods'
import { getApp } from '@tests/utils/getApp'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { GenderAsSex } from '@interfaces/services/authMethods'
import { BankIdDocumentType, BankIdUser } from '@interfaces/services/authMethods/bankId'
import { MessageTemplateCode } from '@interfaces/services/notification'

describe(`Action ${GetTokenAction.name}`, () => {
    const bankMethods = new Set([AuthMethod.BankId, AuthMethod.Monobank, AuthMethod.PrivatBank])
    const code: AuthSchemaCode = AuthSchemaCode.Authorization

    let app: Awaited<ReturnType<typeof getApp>>
    let authUrlAction: AuthUrlAction
    let verifyAuthMethodAction: VerifyAuthMethodAction
    let getTokenAction: GetTokenAction
    let getAuthMethodsAction: GetAuthMethodsAction
    let notificationService: NotificationService
    let userAuthTokenService: UserAuthTokenService
    let userService: UserService
    let identifier: IdentifierService
    let bankIdCryptoServiceClient: BankIdCryptoServiceClient
    let authMethodMockFactory: AuthMethodMockFactory
    let testKit: TestKit

    beforeAll(async () => {
        app = await getApp()
        authUrlAction = app.container.build(AuthUrlAction)
        verifyAuthMethodAction = app.container.build(VerifyAuthMethodAction)
        getTokenAction = app.container.build(GetTokenAction)
        getAuthMethodsAction = app.container.build(GetAuthMethodsAction)
        notificationService = app.container.resolve('notificationService')
        userAuthTokenService = app.container.resolve('userAuthTokenService')
        userService = app.container.resolve('userService')
        identifier = app.container.resolve('identifier')!
        bankIdCryptoServiceClient = app.container.resolve('bankIdCryptoServiceClient')
        authMethodMockFactory = new AuthMethodMockFactory(app)
        testKit = app.container.resolve('testKit')
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should throw ModelNotFoundError for not existed processId', async () => {
        const headers = testKit.session.getHeaders()

        await expect(() =>
            getTokenAction.handler({
                headers,
                params: {
                    processId: 'fakeId',
                },
            }),
        ).rejects.toBeInstanceOf(ModelNotFoundError)
    })

    it('should throw AccessDeniedError for authStep with incomplete status', async () => {
        const headers = testKit.session.getHeaders()
        const { user: userTokenData } = testKit.session.getUserSession()

        const { processId } = await getAuthMethodsAction.handler({
            params: { code: AuthSchemaCode.Authorization },
            headers,
            session: <UserSession>{
                user: userTokenData,
            },
        })

        await expect(() =>
            getTokenAction.handler({
                headers,
                params: {
                    processId,
                },
            }),
        ).rejects.toBeInstanceOf(AccessDeniedError)
    })

    describe.each([[SessionType.User], [SessionType.CabinetUser]])(`Session Type: %s`, (sessionType) => {
        it(`should get token and channelUuid for ${sessionType} `, async () => {
            const headers = testKit.session.getHeaders()
            const { user: userTokenData } = testKit.session.getUserSession({
                sessionType: <SessionType.User>sessionType,
            })

            const { processId, authMethods = [] } = await getAuthMethodsAction.handler({
                params: { code },
                headers,
                session: <UserSession>{
                    user: userTokenData,
                },
            })
            const bankMethod: AuthMethod | undefined = authMethods.find((item: AuthMethod) => bankMethods.has(item))

            Helpers.assertNotToBeUndefined(bankMethod)

            const bankProvider = authMethodMockFactory.getAuthProvider(bankMethod)

            jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert: 'cert' })
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
                addresses: [
                    {
                        type: 'permanent',
                        country: 'US',
                        state: 'California',
                        area: 'Los Angeles County',
                        city: 'Los Angeles',
                        street: 'Sunset Boulevard',
                        houseNo: '123',
                        flatNo: '45',
                    },
                ],
                documents: [
                    {
                        type: BankIdDocumentType.Passport,
                        typeName: 'Passport',
                        series: 'AB',
                        number: '1234567',
                        issue: 'Department of State',
                        dateIssue: '2010-01-01',
                        dateExpiration: '2020-01-01',
                        issueCountryIso2: 'US',
                    },
                ],
            }

            jest.spyOn(bankIdCryptoServiceClient, 'decrypt').mockResolvedValueOnce({ data: JSON.stringify(mockBankIdUser) })
            await bankProvider.getUserData({ headers })
            await verifyAuthMethodAction.handler({
                params: { method: bankMethod, requestId: 'request-id', processId, ...bankProvider.getSpecificParams() },
                headers,
            })

            jest.spyOn(notificationService, 'assignUserToPushToken').mockImplementationOnce(async () => {})
            jest.spyOn(userService, 'createOrUpdateProfile').mockImplementationOnce(async () => {})
            const createIdentifierSpy = jest.spyOn(identifier, 'createIdentifier')
            const sendNotificationSpy = jest.spyOn(userAuthTokenService, 'sendAuthNotification')

            const { token, channelUuid } = await getTokenAction.handler({ params: { processId }, headers })

            expect(token).toEqual(expect.any(String))
            expect(channelUuid).toEqual(expect.any(String))
            expect(createIdentifierSpy).toHaveBeenNthCalledWith(1, expect.any(String), {})
            expect(sendNotificationSpy).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(String),
                MessageTemplateCode.NewDeviceConnecting,
            )
        })
    })
})
