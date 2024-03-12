import { mockInstance } from '@diia-inhouse/test'

import AuthCheckRefreshTokensExpirationScheduledTask from '@src/scheduledTasks/authCheckRefreshTokensExpiration'

import RefreshTokenService from '@services/refreshToken'

describe(`${AuthCheckRefreshTokensExpirationScheduledTask.name}`, () => {
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)

    const authCheckRefreshTokensExpirationScheduledTask = new AuthCheckRefreshTokensExpirationScheduledTask(refreshTokenServiceMock)

    describe(`method: ${authCheckRefreshTokensExpirationScheduledTask.handler.name}`, () => {
        it('should successfully execute check refresh tokens expiration task', async () => {
            jest.spyOn(refreshTokenServiceMock, 'checkRefreshTokensExpiration').mockResolvedValueOnce()

            expect(await authCheckRefreshTokensExpirationScheduledTask.handler()).toBeUndefined()
            expect(refreshTokenServiceMock.checkRefreshTokensExpiration).toHaveBeenCalledWith()
        })
    })
})
