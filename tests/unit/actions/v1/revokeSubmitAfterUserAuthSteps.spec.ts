import TestKit, { mockInstance } from '@diia-inhouse/test'

import RevokeSubmitAfterUserAuthStepsAction from '@actions/v1/revokeSubmitAfterUserAuthSteps'

import UserAuthStepsService from '@services/userAuthSteps'

import { AuthSchemaCode } from '@interfaces/models/authSchema'

describe(`Action ${RevokeSubmitAfterUserAuthStepsAction.name}`, () => {
    const testKit = new TestKit()
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const revokeSubmitAfterUserAuthStepsAction = new RevokeSubmitAfterUserAuthStepsAction(userAuthStepsServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should get revoke submit action info', async () => {
            const args = {
                headers,
                params: { code: AuthSchemaCode.Authorization, mobileUid: 'uuid', userIdentifier: 'id' },
            }

            const mockResponse = { success: true, revokedActions: 0 }

            jest.spyOn(userAuthStepsServiceMock, 'revokeSubmitAfterUserAuthSteps').mockResolvedValueOnce(mockResponse)

            expect(await revokeSubmitAfterUserAuthStepsAction.handler(args)).toMatchObject(mockResponse)
            expect(userAuthStepsServiceMock.revokeSubmitAfterUserAuthSteps).toHaveBeenCalledWith({
                code: args.params.code,
                mobileUid: args.params.mobileUid,
                userIdentifier: args.params.userIdentifier,
            })
        })
    })
})
