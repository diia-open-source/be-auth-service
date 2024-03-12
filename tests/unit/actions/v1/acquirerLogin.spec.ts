import TestKit, { mockInstance } from '@diia-inhouse/test'
import { ServiceUserSession } from '@diia-inhouse/types'

import AcquirerLoginAction from '@actions/v1/acquirerLogin'

import AuthTokenService from '@services/authToken'

describe(`Action ${AcquirerLoginAction.name}`, () => {
    const testKit = new TestKit()
    const authTokenServiceMock = mockInstance(AuthTokenService)
    const acquirerLoginAction = new AcquirerLoginAction(authTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should return token', async () => {
            const token = 'test-token'

            const args = { headers, params: { token }, session: <ServiceUserSession>{} }

            jest.spyOn(authTokenServiceMock, 'getAcquirerAuthToken').mockResolvedValueOnce(token)

            expect(await acquirerLoginAction.handler(args)).toMatchObject({ token })
            expect(authTokenServiceMock.getAcquirerAuthToken).toHaveBeenCalledWith(args.params.token, args.headers.traceId)
        })
    })
})
