import TestKit, { mockInstance } from '@diia-inhouse/test'

import ServiceEntranceLoginAction from '@actions/v1/serviceEntranceLogin'

import UserAuthTokenService from '@services/userAuthToken'

describe(`Action ${ServiceEntranceLoginAction.name}`, () => {
    const testKit = new TestKit()
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const serviceEntranceLoginAction = new ServiceEntranceLoginAction(userAuthTokenService)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should get token', async () => {
            const args = { params: { otp: 'otp' }, headers }

            const mockToken = 'mockToken'

            jest.spyOn(userAuthTokenService, 'getServiceEntranceToken').mockResolvedValueOnce(mockToken)

            expect(await serviceEntranceLoginAction.handler(args)).toMatchObject({ token: mockToken })
            expect(userAuthTokenService.getServiceEntranceToken).toHaveBeenCalledWith(
                args.params.otp,
                args.headers.mobileUid,
                args.headers.traceId,
            )
        })
    })
})
