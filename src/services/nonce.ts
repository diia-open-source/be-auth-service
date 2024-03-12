import { NotFoundError } from '@diia-inhouse/errors'
import { StoreService } from '@diia-inhouse/redis'
import { Logger } from '@diia-inhouse/types'

export default class NonceService {
    constructor(
        private readonly logger: Logger,
        private readonly store: StoreService,
    ) {}

    private readonly cachePrefix: string = 'nonce'

    async getNonceAndRemove(deviceUuid: string): Promise<string> {
        const nonce = await this.getNonce(deviceUuid)

        if (!nonce) {
            const errorMessage = 'Generated nonce was not found'

            this.logger.error(`${errorMessage}. Reason: There is no nonce in cache associated with ${{ deviceUuid }}`)
            throw new NotFoundError(errorMessage)
        }

        await this.removeNonce(deviceUuid)

        return nonce
    }

    async saveNonce(deviceUuid: string, nonce: string, nonceCacheTtl: number): Promise<void> {
        const key = this.generateCacheKey(deviceUuid)

        await this.store.set(key, nonce, { ttl: nonceCacheTtl })
    }

    private async getNonce(deviceUuid: string): Promise<string | null> {
        const key = this.generateCacheKey(deviceUuid)

        return await this.store.get(key)
    }

    private async removeNonce(deviceUuid: string): Promise<number> {
        const key = this.generateCacheKey(deviceUuid)

        return await this.store.remove(key)
    }

    private generateCacheKey(deviceUuid: string): string {
        return `${this.cachePrefix}.${deviceUuid}`
    }
}
