import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetSessionByIdAction from '@actions/v1/getSessionById'

import SessionService from '@services/session'

describe(`Action getSessionById`, () => {
    const testKit = new TestKit()
    const sessionServiceMock = mockInstance(SessionService)

    const action = new GetSessionByIdAction(sessionServiceMock)

    describe('method: `handler`', () => {
        const headers = testKit.session.getHeaders()
        const { user } = testKit.session.getUserSession()

        it('should call sessionService', async () => {
            const args = {
                headers,
                params: { id: 'id', userIdentifier: user.identifier },
            }

            await action.handler(args)

            expect(sessionServiceMock.getSessionById).toHaveBeenCalledWith(args.params.id, args.params.userIdentifier)
        })
    })
})
