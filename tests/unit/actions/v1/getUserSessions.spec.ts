import TestKit, { mockInstance } from '@diia-inhouse/test'
import { UserSession } from '@diia-inhouse/types'

import GetUserSessionsAction from '@actions/v1/getUserSessions'

import SessionService from '@services/session'

import { AuthType } from '@interfaces/services/session'

describe(`Action ${GetUserSessionsAction.name}`, () => {
    const testKit = new TestKit()
    const sessionServiceMock = mockInstance(SessionService)
    const getUserSessionsAction = new GetUserSessionsAction(sessionServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const args = {
            headers,
            params: { id: 'id' },
            session: <UserSession>{
                user: {
                    identifier: 'ident',
                },
            },
        }

        it('should get sessions', async () => {
            const sessions = [
                {
                    id: 'id',
                    status: true,
                    platform: {
                        type: 'Android',
                        version: '1.0.0',
                    },
                    appVersion: '2.0.0',
                    auth: {
                        type: AuthType.BankId,
                        bank: 'Test Bank',
                        creationDate: new Date().toDateString(),
                        lastActivityDate: new Date().toDateString(),
                    },
                },
            ]

            jest.spyOn(sessionServiceMock, 'getSessions').mockResolvedValueOnce(sessions)

            expect(await getUserSessionsAction.handler(args)).toMatchObject({ sessions })
            expect(sessionServiceMock.getSessions).toHaveBeenCalledWith(args.session.user.identifier)
        })
    })
})
