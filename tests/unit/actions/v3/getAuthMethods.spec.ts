import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetAuthMethodsAction from '@actions/v3/getAuthMethods'

import UserAuthStepsService from '@services/userAuthSteps'

import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { AuthMethodsResponse } from '@interfaces/services/userAuthSteps'

describe(`Action ${GetAuthMethodsAction.name}`, () => {
    const testKit = new TestKit()
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const getAttestationNonceAction = new GetAuthMethodsAction(userAuthStepsServiceMock)

    const headers = testKit.session.getHeaders()
    const session = testKit.session.getUserSession()
    const args = {
        headers,
        session,
        params: {
            code: AuthSchemaCode.Authorization,
            processId: 'processId',
        },
    }

    describe('Method `handler`', () => {
        it('should get auth methods', async () => {
            const mockAuthMethodsResponse = <AuthMethodsResponse>{}

            jest.spyOn(userAuthStepsServiceMock, 'getAuthMethods').mockResolvedValueOnce(mockAuthMethodsResponse)

            expect(await getAttestationNonceAction.handler(args)).toMatchObject(mockAuthMethodsResponse)
            expect(userAuthStepsServiceMock.getAuthMethods).toHaveBeenLastCalledWith(
                args.params.code,
                args.headers,
                args.params.processId,
                args.session.user,
            )
        })
    })

    describe('Method `getLockResource`', () => {
        it('should return string with mobileUid info', () => {
            expect(getAttestationNonceAction.getLockResource(args)).toBe(`user-auth-steps-${args.headers.mobileUid}`)
        })
    })
})
