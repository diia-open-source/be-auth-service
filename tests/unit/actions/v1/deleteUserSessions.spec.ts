import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PlatformType, UserSession } from '@diia-inhouse/types'

import DeleteUserSessionsAction from '@actions/v1/deleteUserSessions'

import SessionService from '@services/session'

describe(`Action ${DeleteUserSessionsAction.name}`, () => {
    const testKit = new TestKit()
    const sessionServiceMock = mockInstance(SessionService)
    const deleteUserSessionsAction = new DeleteUserSessionsAction(sessionServiceMock)

    describe('Method `handler`', () => {
        it('should throw BadRequestError if session is successfully deleted', async () => {
            const args = {
                headers: testKit.session.getHeaders(),
                session: <UserSession>{
                    user: { identifier: 'identifier' },
                },
            }

            jest.spyOn(sessionServiceMock, 'deleteSessions').mockResolvedValueOnce()

            await expect(deleteUserSessionsAction.handler(args)).rejects.toEqual(new BadRequestError('Session has been deleted'))
            expect(sessionServiceMock.deleteSessions).toHaveBeenCalledWith(args.session.user.identifier)
        })

        it.each([[PlatformType.Browser], [PlatformType.Huawei], [PlatformType.iOS]])(
            'should return success for platform : %s',
            async (platformType) => {
                const user = testKit.session.getUserSession()
                const args = {
                    headers: testKit.session.getHeaders({
                        platformType,
                    }),
                    session: user,
                }

                jest.spyOn(sessionServiceMock, 'deleteSessions').mockResolvedValueOnce()

                await expect(deleteUserSessionsAction.handler(args)).resolves.toStrictEqual({ success: true })
            },
        )
    })
})
