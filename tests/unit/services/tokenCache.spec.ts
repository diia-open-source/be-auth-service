import { CacheService } from '@diia-inhouse/redis'
import { mockInstance } from '@diia-inhouse/test'

import TokenCacheService from '@services/tokenCache'

describe(`${TokenCacheService.name}`, () => {
    const cacheServiceMock = mockInstance(CacheService)
    const tokenCacheService = new TokenCacheService(cacheServiceMock)

    const refreshTokenValue = 'refreshTokenValue'
    const expirationTime = 100
    const cacheKeyPrefix = 'exp_token_'

    describe('method: `revokeRefreshToken`', () => {
        it('should successfully set token', async () => {
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            await tokenCacheService.revokeRefreshToken(refreshTokenValue, expirationTime)
            expect(cacheServiceMock.set).toHaveBeenCalledWith(`${cacheKeyPrefix}${refreshTokenValue}`, refreshTokenValue, expirationTime)
        })
    })
})
