import { v4 as uuidv4 } from 'uuid'

import { AccessDeniedError, BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import { Logger } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'

import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthProviderFactory } from '@interfaces/services/authMethods'
import { EResidency } from '@interfaces/services/documents'

export default class EResidentQrCodeProvider implements AuthProviderFactory {
    constructor(
        private readonly cache: CacheService,
        private readonly logger: Logger,
        private readonly documentsService: DocumentsService,
    ) {}

    private readonly requestIdExpiration = 900

    async requestAuthorizationUrl(_ops: AuthUrlOps, { mobileUid }: AuthProviderHeaders): Promise<string> {
        const requestId = uuidv4()
        const cacheKey = this.getCacheKey(mobileUid)

        await this.cache.set(cacheKey, requestId, this.requestIdExpiration)

        return requestId
    }

    async verify(requestId: string, { headers: { mobileUid }, qrCodePayload }: AuthMethodVerifyParams): Promise<EResidency> {
        const cacheKey = this.getCacheKey(mobileUid)
        const storedRequestId = await this.cache.get(cacheKey)
        if (requestId !== storedRequestId) {
            throw new AccessDeniedError('Unknown requestId')
        }

        if (!qrCodePayload) {
            throw new BadRequestError(`qrCode is required for ${AuthMethod.EResidentQrCode} auth method`)
        }

        try {
            const [eResidencyData] = await Promise.all([
                this.documentsService.getEResidencyToProcess({ qrCodeToken: qrCodePayload.token, handlePhoto: true }),
                this.cache.remove(cacheKey),
            ])

            return eResidencyData
        } catch (err) {
            this.logger.error('Error getting EResidency by QR code', { err })

            throw new NotFoundError('EResidency document not found by QR code', ProcessCode.EResidentQrCodeFail)
        }
    }

    private getCacheKey(mobileUid: string): string {
        return `authSchema.eResidentQrCode.${mobileUid}`
    }
}
