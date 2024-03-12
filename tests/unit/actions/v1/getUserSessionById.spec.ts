import TestKit, { mockInstance } from '@diia-inhouse/test'
import { UserSession, UserTokenData } from '@diia-inhouse/types'

import GetUserSessionByIdAction from '@actions/v1/getUserSessionById'

import SessionService from '@services/session'

import { AuthType } from '@interfaces/services/session'

describe(`Action ${GetUserSessionByIdAction.name}`, () => {
    const testKit = new TestKit()
    const sessionServiceMock = mockInstance(SessionService)
    const getUserSessionByIdAction = new GetUserSessionByIdAction(sessionServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const args = {
            headers,
            params: { id: 'id' },
            session: <UserSession>{ user: <UserTokenData>{} },
        }

        it('should get session', async () => {
            const mockSession = {
                id: 'id',
                status: true,
                platform: {
                    type: 'Android',
                    version: '1.0.0',
                },
                appVersion: '2.0.0',
                auth: {
                    type: AuthType.BankId,
                    bank: 'MyBank',
                    creationDate: new Date().toDateString(),
                    lastActivityDate: new Date().toDateString(),
                },
                action: {
                    sharing: {
                        name: 'actionSharingName',
                        badge: 123,
                    },
                    signing: {
                        name: 'actionSigningName',
                        badge: 456,
                    },
                },
            }

            jest.spyOn(sessionServiceMock, 'getUserSessionById').mockResolvedValueOnce(mockSession)

            expect(await getUserSessionByIdAction.handler(args)).toMatchObject(mockSession)
            expect(sessionServiceMock.getUserSessionById).toHaveBeenCalledWith(args.session.user, args.params.id)
        })
    })
})
