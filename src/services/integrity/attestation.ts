import { FilterQuery } from 'mongoose'
import { v4 as uuid } from 'uuid'

import { MongoDBErrorCode } from '@diia-inhouse/db'
import { ExternalEvent, ExternalEventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, ApiError, ModelNotFoundError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import IntegrityChallengeResultService from '@services/integrity/challengeResult'

import attestationModel from '@models/integrity/attestation'

import { ExternalResponseEventError } from '@interfaces/externalEventListeners'
import { Attestation, AttestationModel, AttestationResultData } from '@interfaces/models/integrity/attestation'
import { AttestationHeadersParams, IntegrityChallengeService } from '@interfaces/services/integrity/integrityChallenge'

export default class AttestationService implements IntegrityChallengeService {
    constructor(
        private readonly logger: Logger,
        private readonly externalEventBus: ExternalEventBus,
        private readonly integrityChallengeResultService: IntegrityChallengeResultService,
    ) {}

    async createIntegrityChallenge(userIdentifier: string, headers: AttestationHeadersParams): Promise<string> {
        const { mobileUid } = headers
        const { deletedCount }: { deletedCount?: number } = await attestationModel.deleteMany({ mobileUid })

        this.logger.debug('Remove previous device attestations', { mobileUid, deletedCount })

        const attestationData: Attestation = {
            userIdentifier,
            mobileUid,
            nonce: uuid(),
            headers,
        }

        try {
            const attestation = await attestationModel.create(attestationData)

            return attestation.nonce
        } catch (e) {
            return utils.handleError(e, (err) => {
                if (err.getCode() === MongoDBErrorCode.DuplicateKey) {
                    const { keyValue } = <ApiError & { keyValue: Partial<Attestation> }>err
                    const duplicatedValues = keyValue

                    if (duplicatedValues.mobileUid) {
                        throw new AccessDeniedError('Nonce is already requested by a current device')
                    }
                }

                throw err
            })
        }
    }

    async launchIntegrityChallenge(
        userIdentifier: string,
        mobileUid: string,
        signedAttestationStatement: string,
        nonce?: string,
    ): Promise<void> {
        const query: FilterQuery<AttestationModel> = {
            userIdentifier,
            mobileUid,
            nonce,
        }

        const amount: number = await attestationModel.countDocuments(query)
        if (amount === 0) {
            throw new AccessDeniedError('Could not find attestation entity')
        }

        await this.externalEventBus.publish(ExternalEvent.AttestationGoogleDevice, {
            uuid: uuid(),
            request: { signedAttestationStatement, nonce },
        })
    }

    async onSafetyNetAttestationComplete(
        nonce: string,
        ctsProfileMatch: boolean,
        resultData: AttestationResultData,
        error?: ExternalResponseEventError,
    ): Promise<void> {
        const attestation = await this.findAttestationByNonce(nonce)

        attestation.ctsProfileMatch = ctsProfileMatch
        attestation.resultData = resultData
        attestation.error = error

        await attestation.save()

        return await this.integrityChallengeResultService.completeAttestation(ctsProfileMatch, attestation)
    }

    private async findAttestationByNonce(nonce: string): Promise<AttestationModel> {
        const query: FilterQuery<AttestationModel> = { nonce }
        const attestation = await attestationModel.findOne(query)
        if (!attestation) {
            this.logger.fatal(`Could not find attestation entity by a provided nonce: ${nonce}`)

            throw new ModelNotFoundError(attestationModel.modelName, nonce)
        }

        return attestation
    }
}
