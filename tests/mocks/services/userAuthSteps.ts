import { ServiceOperator } from '@diia-inhouse/diia-app'

import UserSessionGenerator from '../userSession'

import VerifyAuthMethodAction from '@actions/v1/verifyAuthMethod'
import AuthUrlAction from '@actions/v3/authUrl'
import GetAuthMethodsAction from '@actions/v3/getAuthMethods'

import UserService from '@services/user'

import Helpers from '@tests/helpers'
import { AuthMockProvider } from '@tests/interfaces/mocks/services/authMethods'
import AuthMethodMockFactory from '@tests/mocks/services/authMethods'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'

export default class UserAuthStepsService {
    constructor(private readonly app: ServiceOperator<AppConfig, AppDeps>) {}

    private readonly userSessionGenerator = new UserSessionGenerator(this.app.container.resolve('identifier'))

    private readonly userService: UserService = this.app.container.resolve('userService')

    private readonly getAuthMethodsAction = this.app.container.build(GetAuthMethodsAction)

    private readonly authUrlAction = this.app.container.build(AuthUrlAction)

    private readonly verifyAuthMethodAction = this.app.container.build(VerifyAuthMethodAction)

    private readonly authMethodMockFactory = new AuthMethodMockFactory(this.app)

    async finishDiiaIdCreationSteps(
        session = this.userSessionGenerator.getUserSession(),
        headers = this.userSessionGenerator.getHeaders(),
    ): Promise<string> {
        const code = AuthSchemaCode.DiiaIdCreation

        jest.spyOn(this.userService, 'hasOneOfDocuments').mockImplementationOnce(async () => true)
        jest.spyOn(this.userService, 'hasDiiaIdIdentifier').mockImplementationOnce(async () => false)

        const { processId, authMethods: initialMethods = [] } = await this.getAuthMethodsAction.handler({
            params: { code },
            headers,
            session,
        })
        const photoIdMethod = initialMethods.find((item: AuthMethod) => item === AuthMethod.PhotoId)

        Helpers.assertNotToBeUndefined(photoIdMethod)

        const photoIdProvider: AuthMockProvider = this.authMethodMockFactory.getAuthProvider(photoIdMethod)

        await photoIdProvider.requestAuthorizationUrl()
        const { authUrl } = await this.authUrlAction.handler({ params: { processId, target: photoIdMethod }, headers, session })

        const requestId: string = Helpers.extractAuthUrlRequestId(authUrl)

        await photoIdProvider.getUserData({ requestId })
        await this.verifyAuthMethodAction.handler({
            params: { method: photoIdMethod, requestId, processId },
            headers,
            session,
        })

        return processId
    }
}
