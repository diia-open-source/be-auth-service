import { mongo } from '@diia-inhouse/db'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PartnerSession, SessionType } from '@diia-inhouse/types'

import PartnerAcquirerLoginAction from '@actions/v1/partnerAcquirerLogin'

import AuthTokenService from '@services/authToken'

describe(`Action ${PartnerAcquirerLoginAction.name}`, () => {
    const testKit = new TestKit()
    const authTokenServiceMock = mockInstance(AuthTokenService)
    const partnerAcquirerLoginAction = new PartnerAcquirerLoginAction(authTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = { ...testKit.session.getHeaders(), traceId: 'trace' }
        const partnerId = new mongo.ObjectId()
        const args = {
            headers,
            session: <PartnerSession<string>>{
                sessionType: SessionType.Partner,
                partner: {
                    _id: partnerId.toString(),
                    scopes: {},
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
                partnerId,
                args.headers.traceId,
            )
        })
    })
})
