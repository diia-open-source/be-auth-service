import { v4 as uuidv4 } from 'uuid'

import { AccessDeniedError, BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import { Logger } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'

import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthProviderFactory } from '@interfaces/services/authMethods'
import { EResidency, EResidencyCountryInfo } from '@interfaces/services/documents'

export default class EResidentMrzProvider implements AuthProviderFactory {
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

    async verify(requestId: string, { headers: { mobileUid }, mrzPayload }: AuthMethodVerifyParams): Promise<EResidency> {
        if (!mrzPayload) {
            throw new BadRequestError(`Mrz payload is required for ${AuthMethod.EResidentMrz} auth method`)
        }

        if (!(await this.isCountryAllowedForEResidence(mrzPayload.residenceCountry))) {
            throw new AccessDeniedError(
                `Unsupported e-resident country: ${mrzPayload.residenceCountry}`,
                {},
                ProcessCode.EResidentDocumentNotSupported,
            )
        }

        const cacheKey = this.getCacheKey(mobileUid)
        const storedRequestId = await this.cache.get(cacheKey)

        if (requestId !== storedRequestId) {
            throw new AccessDeniedError('Unknown requestId')
        }

        try {
            const [eResidencyData] = await Promise.all([
                this.documentsService.getEResidencyToProcess({
                    issuingCountry: mrzPayload.residenceCountry,
                    docNumber: mrzPayload.docNumber,
                    handlePhoto: true,
                }),
                this.cache.remove(cacheKey),
            ])

            return eResidencyData
        } catch (err) {
            this.logger.error('Error getting EResidency by MRZ', { err })

            throw new NotFoundError('EResidency document not found by MRZ', ProcessCode.EResidentAuthFail)
        }
    }

    private async isCountryAllowedForEResidence(countryCode?: string): Promise<boolean> {
        const countries = await this.documentsService.getEResidentCountriesInfo()

        const country = countries.find(({ alpha3 }: EResidencyCountryInfo): boolean => alpha3.toLocaleUpperCase() === countryCode)
        if (!country) {
            return false
        }

        return country.isCountryResidence
    }

    private getCacheKey(mobileUid: string): string {
        return `authSchema.eResidentMrzCode.${mobileUid}`
    }
}
