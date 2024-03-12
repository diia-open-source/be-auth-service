import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetNfcTokenAction from '@actions/v1/getNfcToken'

import UserAuthTokenService from '@services/userAuthToken'

import { AuthUser } from '@interfaces/services/userAuthToken'

describe(`Action ${GetNfcTokenAction.name}`, () => {
    const testKit = new TestKit()
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const getNfcTokenAction = new GetNfcTokenAction(userAuthTokenService)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should get token', async () => {
            const mockToken = { token: 'token', identifier: 'identifier', tokenData: <AuthUser>{} }

            jest.spyOn(userAuthTokenService, 'getNfcUserToken').mockResolvedValueOnce(mockToken)

            expect(await getNfcTokenAction.handler({ headers })).toMatchObject({ token: mockToken.token })
            expect(userAuthTokenService.getNfcUserToken).toHaveBeenCalledWith(headers)
        })
    })
})
