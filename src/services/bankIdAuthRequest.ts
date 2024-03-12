import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'

export default class BankIdAuthRequestService {
    constructor(private readonly cache: CacheService) {}

    private readonly bankIdAuthRequestKey: string = 'bank-id.auth'

    private readonly bankIdAuthRequestExpiration: number = 300

    async createRequest(mobileUid: string, bankId: string): Promise<void> {
        await this.cache.set(this.prepareRequestAuthKey(mobileUid), bankId, this.bankIdAuthRequestExpiration)
    }

    async validateRequest(mobileUid: string, bankId: string): Promise<void> {
        const requestBankId = await this.cache.get(this.prepareRequestAuthKey(mobileUid))
        if (!requestBankId) {
            throw new BadRequestError('Unexpected authorization with bankId')
        }

        if (bankId !== requestBankId) {
            throw new AccessDeniedError('Attempt to authorize with wrong bankId', { bankId })
        }
    }

    private prepareRequestAuthKey(mobileUid: string): string {
        return `${this.bankIdAuthRequestKey}.${mobileUid}`
    }
}
