import TestKit, { mockInstance } from '@diia-inhouse/test'

import PartnerLoginAction from '@actions/v1/partnerLogin'

import AuthTokenService from '@services/authToken'

describe(`Action ${PartnerLoginAction.name}`, () => {
    const testKit = new TestKit()
    const authTokenServiceMock = mockInstance(AuthTokenService)
    const partnerLoginAction = new PartnerLoginAction(authTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const args = { headers, params: { token: 'id' } }

        it('should get token', async () => {
            const mockToken = 'token'

            jest.spyOn(authTokenServiceMock, 'getPartnerAuthToken').mockResolvedValueOnce(mockToken)

            expect(await partnerLoginAction.handler(args)).toMatchObject({ token: mockToken })
            expect(authTokenServiceMock.getPartnerAuthToken).toHaveBeenCalledWith(args.params.token, args.headers.traceId)
        })
    })
})
