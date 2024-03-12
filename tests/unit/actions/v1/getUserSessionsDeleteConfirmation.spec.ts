import TestKit, { mockInstance } from '@diia-inhouse/test'
import { UserSession } from '@diia-inhouse/types'

import GetUserSessionsDeleteConfirmationAction from '@actions/v1/getUserSessionsDeleteConfirmation'

import SessionService from '@services/session'

import { ProcessCode } from '@interfaces/services'

describe(`Action ${GetUserSessionsDeleteConfirmationAction.name}`, () => {
    const testKit = new TestKit()
    const sessionServiceMock = mockInstance(SessionService)
    const getUserSessionsDeleteConfirmationAction = new GetUserSessionsDeleteConfirmationAction(sessionServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const args = {
            headers,
            session: <UserSession>{
                user: {
                    identifier: 'ident',
                },
            },
        }

        it('should get process code', async () => {
            jest.spyOn(sessionServiceMock, 'getDeleteConfirmation').mockResolvedValueOnce(ProcessCode.DeleteUserSessionConfirmation)

            expect(await getUserSessionsDeleteConfirmationAction.handler(args)).toMatchObject({
                processCode: ProcessCode.DeleteUserSessionConfirmation,
            })
            expect(sessionServiceMock.getDeleteConfirmation).toHaveBeenCalledWith(args.session.user.identifier)
        })
    })
})
