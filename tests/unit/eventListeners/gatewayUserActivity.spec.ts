import TestKit, { mockInstance } from '@diia-inhouse/test'

import GatewayUserActivityEventListener from '@src/eventListeners/gatewayUserActivity'

import RefreshTokenService from '@services/refreshToken'

import { EventPayload } from '@interfaces/eventListeners/gatewayUserActivity'

describe('GatewayUserActivityEventListener', () => {
    const testKit = new TestKit()
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const gatewayUserActivityEventListener = new GatewayUserActivityEventListener(refreshTokenServiceMock)

    describe(`method: ${gatewayUserActivityEventListener.handler.name}`, () => {
        it('should successfully invoke update activity process for specific userIdentifier and mobileUid', async () => {
            const {
                user: { identifier: userIdentifier },
            } = testKit.session.getUserSession()
            const { mobileUid } = testKit.session.getHeaders()
            const message: EventPayload = {
                mobileUid,
                userIdentifier,
            }

            jest.spyOn(refreshTokenServiceMock, 'updateActivity').mockResolvedValueOnce()

            expect(await gatewayUserActivityEventListener.handler(message)).toBeUndefined()
            expect(refreshTokenServiceMock.updateActivity).toHaveBeenCalledWith(userIdentifier, mobileUid)
        })
    })
})
