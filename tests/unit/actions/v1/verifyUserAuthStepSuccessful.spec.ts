import TestKit, { mockInstance } from '@diia-inhouse/test'

import VerifyUserAuthStepSuccessful from '@actions/v1/verifyUserAuthStepSuccessful'

import UserAuthStepsService from '@services/userAuthSteps'

import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStepsModel } from '@interfaces/models/userAuthSteps'

describe(`Action ${VerifyUserAuthStepSuccessful.name}`, () => {
    const testKit = new TestKit()
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const verifyUserAuthStepSuccessful = new VerifyUserAuthStepSuccessful(userAuthStepsServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()
        const args = {
            headers,
            session,
            params: {
                schemaCode: AuthSchemaCode.Authorization,
                processId: 'processId',
            },
        }

        it('should successfully verify auth step', async () => {
            jest.spyOn(userAuthStepsServiceMock, 'verifyUserAuthStepSuccessful').mockResolvedValueOnce(<UserAuthStepsModel>{})

            await verifyUserAuthStepSuccessful.handler(args)

            expect(userAuthStepsServiceMock.verifyUserAuthStepSuccessful).toHaveBeenCalledWith({
                code: args.params.schemaCode,
                processId: args.params.processId,
                mobileUid: args.headers.mobileUid,
                userIdentifier: args.session.user.identifier,
            })
        })
    })
})
