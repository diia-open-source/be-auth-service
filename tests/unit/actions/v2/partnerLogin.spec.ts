import TestKit, { mockInstance } from '@diia-inhouse/test'

import PartnerLoginAction from '@actions/v2/partnerLogin'

import AuthTokenService from '@services/authToken'

describe(`Action ${PartnerLoginAction.name}`, () => {
    const testKit = new TestKit()
    const mockAuthTokenService = mockInstance(AuthTokenService)
    const getAttestationNonceAction = new PartnerLoginAction(mockAuthTokenService)

    describe('Method `handler`', () => {
        const headers = { ...testKit.session.getHeaders(), traceId: 'id' }

        const args = {
            headers,
            params: { bearerToken: 'token' },
        }

        it('should get token', async () => {
            const mockToken = 'token'

            jest.spyOn(mockAuthTokenService, 'getPartnerAuthToken').mockResolvedValueOnce(mockToken)

            expect(await getAttestationNonceAction.handler(args)).toMatchObject({ token: mockToken })

            expect(mockAuthTokenService.getPartnerAuthToken).toHaveBeenCalledWith(args.params.bearerToken, args.headers.traceId)
        })
    })
})
