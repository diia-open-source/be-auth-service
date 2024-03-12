import { randomUUID } from 'crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType, UserSession } from '@diia-inhouse/types'

import CompleteUserAuthStepsAction from '@actions/v1/completeUserAuthSteps'

import UserAuthStepsService from '@services/userAuthSteps'

import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStepsModel } from '@interfaces/models/userAuthSteps'

describe(`Action ${CompleteUserAuthStepsAction.name}`, () => {
    const testKit = new TestKit()
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const completeUserAuthStepsAction = new CompleteUserAuthStepsAction(userAuthStepsServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should complete auth steps', async () => {
            const processId = randomUUID()
            const args = {
                headers,
                params: { schemaCode: AuthSchemaCode.Authorization, processId },
                session: <UserSession>{
                    sessionType: SessionType.User,
                    user: { identifier: '' },
                },
            }

            jest.spyOn(userAuthStepsServiceMock, 'completeSteps').mockResolvedValueOnce(<UserAuthStepsModel>{})

            await completeUserAuthStepsAction.handler(args)

            expect(userAuthStepsServiceMock.completeSteps).toHaveBeenCalledWith({
                code: AuthSchemaCode.Authorization,
                processId,
                mobileUid: args.headers.mobileUid,
                userIdentifier: args.session.user.identifier,
            })
        })
    })
})
