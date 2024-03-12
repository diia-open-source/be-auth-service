import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetTemporaryTokenAction from '@actions/v1/getTemporaryToken'

import UserAuthTokenService from '@services/userAuthToken'

describe(`Action ${GetTemporaryTokenAction.name}`, () => {
    const testKit = new TestKit()
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const getTemporaryTokenAction = new GetTemporaryTokenAction(userAuthTokenService)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should get token', async () => {
            const mockToken = 'token'

            jest.spyOn(userAuthTokenService, 'getTemporaryToken').mockResolvedValueOnce(mockToken)

            expect(await getTemporaryTokenAction.handler({ headers })).toMatchObject({ token: mockToken })
            expect(userAuthTokenService.getTemporaryToken).toHaveBeenCalledWith(headers)
        })
    })
})
