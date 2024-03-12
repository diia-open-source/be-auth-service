import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PartnerScopes, PartnerSession, SessionType } from '@diia-inhouse/types'

import PartnerAcquirerLoginAction from '@actions/v1/partnerAcquirerLogin'

import AuthTokenService from '@services/authToken'

describe(`Action ${PartnerAcquirerLoginAction.name}`, () => {
    const testKit = new TestKit()
    const authTokenServiceMock = mockInstance(AuthTokenService)
    const partnerAcquirerLoginAction = new PartnerAcquirerLoginAction(authTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = { ...testKit.session.getHeaders(), traceId: 'trace' }
        const args = {
            headers,
            session: <PartnerSession>{
                sessionType: SessionType.Partner,
                partner: {
                    _id: Object('id'),
                    scopes: <PartnerScopes>{},
                    refreshToken: { value: 'test-token', expirationTime: 1000 },
                    sessionType: SessionType.Partner,
                },
            },
            params: { acquirerId: 'id' },
        }

        it('should get token', async () => {
            const mockToken = 'token'

            jest.spyOn(authTokenServiceMock, 'getPartnerAcquirerAuthToken').mockResolvedValueOnce(mockToken)

            expect(await partnerAcquirerLoginAction.handler(args)).toMatchObject({ token: mockToken })
            expect(authTokenServiceMock.getPartnerAcquirerAuthToken).toHaveBeenCalledWith(
                args.params.acquirerId,
                args.session.partner._id,
                args.headers.traceId,
            )
        })
    })
})
