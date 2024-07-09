import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { ExternalCommunicatorError, NotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import { HttpStatusCode, Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import { ExternalEvent } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'
import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { QrCodePayload } from '@interfaces/services/userAuthSteps'

export default class EResidentFirstAuthService {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly external: ExternalCommunicator,
        private readonly cache: CacheService,
    ) {}

    private readonly cachePrefix = 'authSchema.eResidentQrCode.token'

    async saveQrCodeTokenInCache(code: AuthSchemaCode, mobileUuid: string, qrCodePayload: QrCodePayload | undefined): Promise<void> {
        if (qrCodePayload && qrCodePayload.token) {
            const cacheKey: string = this.getCacheKey(mobileUuid)
            const cacheTtl: number = this.getAuthorizationCacheTtlSec(code)

            await this.cache.set(cacheKey, qrCodePayload.token, cacheTtl)
        }
    }

    async confirmAuth(itn: string, mobileUuid: string): Promise<void> {
        try {
            const qrCodeToken = await this.getQrCodeTokenCache(mobileUuid)

            if (!qrCodeToken) {
                throw new NotFoundError('QrCode token not found')
            }

            await this.external.receive(ExternalEvent.EResidentAuthConfirmation, { itn, qrCodeToken })
            this.logger.info('Successfully confirmed e-resident first auth')
        } catch (err) {
            utils.handleError(err, (apiError) => {
                this.logger.fatal('Failed to confirm first auth', { err: apiError })

                const errorCode = apiError.getCode()

                if (errorCode === HttpStatusCode.NOT_FOUND) {
                    throw new NotFoundError('Failed to confirm first auth', ProcessCode.EResidentQrCodeFail)
                }

                throw new ExternalCommunicatorError('Failed to confirm first auth', errorCode, { err: apiError })
            })
        }
    }

    private getCacheKey(mobileUuid: string): string {
        return `${this.cachePrefix}_${mobileUuid}`
    }

    private async getQrCodeTokenCache(mobileUuid: string): Promise<string | null> {
        const key = this.getCacheKey(mobileUuid)

        return await this.cache.get(key)
    }

    private getAuthorizationCacheTtlSec(code: AuthSchemaCode): number {
        const authSchema = this.config.authService.schema.schemaMap[code]

        if (!authSchema) {
            return Math.floor(this.config.authService.schema.schemaMap[AuthSchemaCode.EResidentFirstAuth].tokenParamsCacheTtl / 1000)
        }

        return authSchema.tokenParamsCacheTtl / 1000
    }
}
