import { v4 as uuidv4 } from 'uuid'

import { CryptoDocServiceClient, SignOwnerInfo } from '@diia-inhouse/diia-crypto-client'
import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import DiiaSignatureService from '@services/diiaSignature'
import DocumentAcquirersService from '@services/documentAcquirers'
import NonceService from '@services/nonce'

import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthMethodVerifyResult, AuthProviderFactory } from '@interfaces/services/authMethods'

export default class DsProvider implements AuthProviderFactory {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,

        private readonly diiaSignatureService: DiiaSignatureService,
        private readonly documentAcquirersService: DocumentAcquirersService,
        private readonly nonceService: NonceService,
        private readonly cryptoDocServiceClient: CryptoDocServiceClient,
    ) {}

    async requestAuthorizationUrl(_: AuthUrlOps, headers: AuthProviderHeaders): Promise<string> {
        const deviceUuid = headers.mobileUid
        const requestId: string = Buffer.from(uuidv4()).toString('base64')
        const { nonceCacheTtl } = this.config.auth.schema.schemaMap[AuthSchemaCode.CabinetAuthorization]
        const hashedRequestId = await this.generateHash(requestId)
        const deeplink = await this.getDeeplink(hashedRequestId)

        if (!nonceCacheTtl) {
            throw new BadRequestError('NonceTTL is not defined')
        }

        await this.nonceService.saveNonce(deviceUuid, requestId, nonceCacheTtl)

        return `${deeplink}?requestId=${encodeURIComponent(hashedRequestId)}`
    }

    async verify(requestId: string, verifyParams: AuthMethodVerifyParams): Promise<AuthMethodVerifyResult> {
        const {
            headers: { mobileUid },
        } = verifyParams

        const nonce = await this.nonceService.getNonceAndRemove(mobileUid)
        const signature = await this.getSignature(requestId)
        const signerInfo = await this.verifySignature(signature, nonce)

        return { ...signerInfo, authMethod: AuthMethod.Ds }
    }

    private async getDeeplink(requestId: string): Promise<string> {
        try {
            const { deeplink } = await this.documentAcquirersService.createOfferRequest(requestId)

            return deeplink
        } catch (e) {
            return utils.handleError(e, (err) => {
                const errorMessage = `Unable to get deeplink for requestId: ${requestId}`

                this.logger.error(`${errorMessage} Reason:`, { err })
                throw new AccessDeniedError(errorMessage)
            })
        }
    }

    private async getSignature(requestId: string): Promise<string> {
        try {
            const signature = await this.diiaSignatureService.getSignature(requestId)

            return signature
        } catch (e) {
            return utils.handleError(e, (err) => {
                const errorMessage = `Unable to get signature for requestId: ${requestId}`

                this.logger.error(`${errorMessage} Reason:`, { err })
                throw new AccessDeniedError(errorMessage)
            })
        }
    }

    private async verifySignature(signature: string, data: string): Promise<SignOwnerInfo> {
        try {
            const { ownerInfo } = await this.cryptoDocServiceClient.docVerifySignExternal({ signature, data })
            if (!ownerInfo) {
                throw new AccessDeniedError('Owner info is not provided')
            }

            return ownerInfo
        } catch (err) {
            const errorMessage = 'Verify signature for DS method has failed'

            this.logger.error(`${errorMessage}. Reason:`, { err })
            throw new AccessDeniedError(errorMessage)
        }
    }

    private async generateHash(content: string): Promise<string> {
        try {
            const { hash } = await this.cryptoDocServiceClient.docGenerateHash({ content })

            return hash
        } catch (err) {
            const errorMessage = 'Generate hash failed'

            this.logger.error(`${errorMessage}. Reason:`, { err })
            throw new BadRequestError(errorMessage)
        }
    }
}
