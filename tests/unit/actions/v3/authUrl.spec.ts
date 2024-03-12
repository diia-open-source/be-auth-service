import TestKit, { mockInstance } from '@diia-inhouse/test'

import AuthUrlAction from '@actions/v3/authUrl'

import AuthService from '@services/auth'
import AuthSchemaService from '@services/authSchema'
import UserAuthStepsService from '@services/userAuthSteps'
import UserAuthTokenService from '@services/userAuthToken'

import { AuthMethod, AuthSchemaCode, AuthSchemaModel } from '@interfaces/models/authSchema'
import { UserAuthStepsModel } from '@interfaces/models/userAuthSteps'
import { FaceLivenessDetectionVersion } from '@interfaces/services/authSchema'

describe(`Action ${AuthUrlAction.name}`, () => {
    const testKit = new TestKit()
    const authServiceMock = mockInstance(AuthService)
    const authSchemaServiceMock = mockInstance(AuthSchemaService)
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const userAuthTokenServiceMock = mockInstance(UserAuthTokenService)
    const getAttestationNonceAction = new AuthUrlAction(
        authServiceMock,
        authSchemaServiceMock,
        userAuthStepsServiceMock,
        userAuthTokenServiceMock,
    )
    const headers = testKit.session.getHeaders()
    const session = testKit.session.getUserSession()
    const args = {
        headers,
        session,
        params: {
            target: AuthMethod.Qes,
            bankId: 'bankId',
            processId: 'processId',
            isLowRamDevice: false,
            builtInTrueDepthCamera: false,
            email: 'email',
        },
    }

    describe('Method `handler`', () => {
        it('should get authUrl', async () => {
            const mockAuthUrl = 'auth-url'

            const mockSetStepMethodResponse: [AuthSchemaModel, UserAuthStepsModel] = [
                <AuthSchemaModel>{ code: AuthSchemaCode.Authorization },
                <UserAuthStepsModel>{ userIdentifier: 'identifier' },
            ]

            jest.spyOn(userAuthStepsServiceMock, 'setStepMethod').mockResolvedValueOnce(mockSetStepMethodResponse)

            jest.spyOn(authServiceMock, 'getAuthUrl').mockResolvedValueOnce(mockAuthUrl)

            expect(await getAttestationNonceAction.handler(args)).toMatchObject({
                authUrl: mockAuthUrl,
            })
            expect(userAuthStepsServiceMock.setStepMethod).toHaveBeenLastCalledWith(
                args.session.user,
                args.headers,
                args.params.target,
                args.params.processId,
            )
            expect(authServiceMock.getAuthUrl).toHaveBeenLastCalledWith(
                args.params.target,
                {
                    bankId: args.params.bankId,
                    userIdentifier: mockSetStepMethodResponse[1].userIdentifier,
                    email: args.params.email,
                },
                args.headers,
                mockSetStepMethodResponse[0].code,
            )
        })

        it('should get authUrl with additional data', async () => {
            const updatedArgs = {
                ...args,
                params: {
                    ...args.params,
                    target: AuthMethod.Nfc,
                },
            }

            const mockAuthUrl = 'auth-url'
            const mockToken = 'token'
            const mockFldConfig = { version: FaceLivenessDetectionVersion.V1 }

            const mockSetStepMethodResponse: [AuthSchemaModel, UserAuthStepsModel] = [
                <AuthSchemaModel>{ code: AuthSchemaCode.Authorization },
                <UserAuthStepsModel>{ userIdentifier: 'identifier' },
            ]

            jest.spyOn(userAuthStepsServiceMock, 'setStepMethod').mockResolvedValueOnce(mockSetStepMethodResponse)

            jest.spyOn(authServiceMock, 'getAuthUrl').mockResolvedValueOnce(mockAuthUrl)

            jest.spyOn(userAuthTokenServiceMock, 'getTemporaryToken').mockResolvedValueOnce(mockToken)

            jest.spyOn(authSchemaServiceMock, 'getFldConfig').mockResolvedValueOnce(mockFldConfig)

            expect(await getAttestationNonceAction.handler(updatedArgs)).toMatchObject({
                authUrl: mockAuthUrl,
                token: mockToken,
                fld: mockFldConfig,
            })
            expect(userAuthStepsServiceMock.setStepMethod).toHaveBeenLastCalledWith(
                updatedArgs.session.user,
                updatedArgs.headers,
                updatedArgs.params.target,
                updatedArgs.params.processId,
            )
            expect(authServiceMock.getAuthUrl).toHaveBeenLastCalledWith(
                updatedArgs.params.target,
                {
                    bankId: updatedArgs.params.bankId,
                    userIdentifier: mockSetStepMethodResponse[1].userIdentifier,
                    email: updatedArgs.params.email,
                },
                updatedArgs.headers,
                mockSetStepMethodResponse[0].code,
            )
            expect(userAuthTokenServiceMock.getTemporaryToken).toHaveBeenLastCalledWith(args.headers)
            expect(authSchemaServiceMock.getFldConfig).toHaveBeenLastCalledWith(
                mockSetStepMethodResponse[0],
                updatedArgs.headers,
                updatedArgs.params.isLowRamDevice,
                updatedArgs.params.builtInTrueDepthCamera,
            )
        })
    })

    describe('Method `getLockResource`', () => {
        it('should return string with mobileUid info', () => {
            expect(getAttestationNonceAction.getLockResource(args)).toBe(`user-auth-steps-${args.headers.mobileUid}`)
        })
    })
})
