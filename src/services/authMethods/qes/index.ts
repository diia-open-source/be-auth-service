import { randomUUID as uuid } from 'node:crypto'

import { CryptoDocServiceClient, SignOwnerInfo } from '@diia-inhouse/diia-crypto-client'
import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import NonceService from '@services/nonce'

import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthMethodVerifyResult, AuthProviderFactory } from '@interfaces/services/authMethods'

export default class QesProvider implements AuthProviderFactory {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,

        private readonly nonceService: NonceService,
        private readonly cryptoDocServiceClient: CryptoDocServiceClient,
    ) {}

    async requestAuthorizationUrl(_: AuthUrlOps, headers: AuthProviderHeaders): Promise<string> {
        const deviceUuid = headers.mobileUid
        const requestId = uuid()
        const { nonceCacheTtl } = this.config.auth.schema.schemaMap[AuthSchemaCode.CabinetAuthorization]

        if (!nonceCacheTtl) {
            throw new BadRequestError('NonceTTL is not defined')
        }

        await this.nonceService.saveNonce(deviceUuid, requestId, nonceCacheTtl)

        return requestId
    }

    async verify(_requestId: string, verifyParams: AuthMethodVerifyParams): Promise<AuthMethodVerifyResult> {
        const {
            qesPayload,
            headers: { mobileUid },
        } = verifyParams

        if (!qesPayload) {
            throw new BadRequestError(`qesPayload is required for ${AuthMethod.Qes} auth method`)
        }

        const { signature } = qesPayload

        const nonce = await this.nonceService.getNonceAndRemove(mobileUid)
        const signerInfo = await this.verifySignature(signature, nonce)

        return { ...signerInfo, authMethod: AuthMethod.Qes }
    }

    private async verifySignature(signature: string, nonce: string): Promise<SignOwnerInfo> {
        try {
            const data = Buffer.from(nonce).toString('base64')
            const { ownerInfo } = await this.cryptoDocServiceClient.docVerifySignExternal({ signature, data })
            if (!ownerInfo) {
                throw new AccessDeniedError('Owner info is not provided')
            }

            return ownerInfo
        } catch (err) {
            const errorMessage = 'Verify signature for QES method has failed'

            this.logger.error(`${errorMessage}. Reason:`, { err })
            throw new AccessDeniedError(errorMessage)
        }
    }
}
