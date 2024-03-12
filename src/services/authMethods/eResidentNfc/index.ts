import { v4 as uuidv4 } from 'uuid'

import { AccessDeniedError, NotFoundError, UnauthorizedError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import { EResidency, Logger } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'
import NfcService from '@services/nfc'

import { ProcessCode } from '@interfaces/services'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthProviderFactory } from '@interfaces/services/authMethods'
import { EResidencyCountryInfo } from '@interfaces/services/documents'

export default class EResidentNfcProvider implements AuthProviderFactory {
    constructor(
        private readonly cache: CacheService,
        private readonly logger: Logger,

        private readonly documentsService: DocumentsService,
        private readonly nfcService: NfcService,
    ) {}

    private readonly requestIdExpiration = 900

    async requestAuthorizationUrl(_ops: AuthUrlOps, { mobileUid }: AuthProviderHeaders): Promise<string> {
        const requestId = uuidv4()
        const cacheKey = this.getCacheKey(mobileUid)

        await this.cache.set(cacheKey, requestId, this.requestIdExpiration)

        return requestId
    }

    async verify(requestId: string, { headers: { mobileUid } }: AuthMethodVerifyParams): Promise<EResidency> {
        const cacheKey = this.getCacheKey(mobileUid)
        const storedRequestId = await this.cache.get(cacheKey)

        await this.cache.remove(cacheKey)

        if (requestId !== storedRequestId) {
            throw new AccessDeniedError('Unknown requestId')
        }

        const isUserPhotoVerified: boolean = await this.nfcService.isUserPhotoVerified(mobileUid)
        if (!isUserPhotoVerified) {
            this.logger.error('User photo is not verified')

            throw new UnauthorizedError('Photo Identification is not successful', ProcessCode.EResidentPhotoIdFail)
        }

        const userData = await this.nfcService.getUserDataFromCache(mobileUid)
        if (!userData || !Object.keys(userData).length) {
            throw new NotFoundError('User data not found in Redis', ProcessCode.EResidentAuthFail)
        }

        if (!userData.issuingState || !(await this.isCountryAllowedForEResidence(userData.issuingState))) {
            throw new AccessDeniedError(
                `Unsupported e-resident country: ${userData.issuingState}`,
                {},
                ProcessCode.EResidentDocumentNotSupported,
            )
        }

        try {
            const eResidencyData = await this.documentsService.getEResidencyToProcess({
                issuingCountry: userData.issuingState,
                docNumber: userData.docNumber,
                handlePhoto: false,
            })

            return eResidencyData
        } catch (err) {
            this.logger.error('Error getting EResidency by NFC', { err })

            throw new NotFoundError('EResidency document not found by NFC', ProcessCode.EResidentAuthFail)
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
        return `authSchema.eResidentNfcCode.${mobileUid}`
    }
}
