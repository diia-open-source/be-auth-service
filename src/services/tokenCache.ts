import { CacheService } from '@diia-inhouse/redis'

export default class TokenCacheService {
    constructor(private readonly cache: CacheService) {}

    private readonly cacheKeyPrefix: string = 'exp_token_'

    async revokeRefreshToken(refreshTokenValue: string, expirationTime: number): Promise<void> {
        await this.cache.set(this.prepareKey(refreshTokenValue), refreshTokenValue, expirationTime)
    }

    private prepareKey(key: string): string {
        return `${this.cacheKeyPrefix}${key}`
    }
}
