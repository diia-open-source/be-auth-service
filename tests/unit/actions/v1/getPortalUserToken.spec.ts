import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PortalUser } from '@diia-inhouse/types'

import GetPortalUserTokenAction from '@actions/v1/getPortalUserToken'

import AuthTokenService from '@services/authToken'

describe(`Action ${GetPortalUserTokenAction.name}`, () => {
    const testKit = new TestKit()
    const authTokenServiceMock = mockInstance(AuthTokenService)
    const getPortalUserTokenAction = new GetPortalUserTokenAction(authTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const args = { headers, params: <PortalUser>{} }

        it('should get token', async () => {
            const mockToken = 'token'

            jest.spyOn(authTokenServiceMock, 'getPortalUserToken').mockResolvedValueOnce(mockToken)

            expect(await getPortalUserTokenAction.handler(args)).toMatchObject({ token: mockToken })
            expect(authTokenServiceMock.getPortalUserToken).toHaveBeenCalledWith(<PortalUser>{}, args.headers.traceId)
        })
    })
})
