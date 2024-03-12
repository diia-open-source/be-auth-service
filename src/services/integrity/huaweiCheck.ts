import { FilterQuery } from 'mongoose'
import { v4 as uuid } from 'uuid'

import { MongoDBErrorCode } from '@diia-inhouse/db'
import { ExternalEvent, ExternalEventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, ApiError, ModelNotFoundError } from '@diia-inhouse/errors'
import { ActHeaders, Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import IntegrityChallengeResultService from '@services/integrity/challengeResult'

import huaweiIntegrityCheckModel from '@models/integrity/huaweiIntegrityCheck'

import { ExternalResponseEventError } from '@interfaces/externalEventListeners'
import { AttestationModel } from '@interfaces/models/integrity/attestation'
import { GoogleIntegrityCheck } from '@interfaces/models/integrity/googleIntegrityCheck'
import {
    HuaweiIntegrityCheck,
    HuaweiIntegrityCheckModel,
    HuaweiIntegrityCheckStatus,
    HuaweiIntegrityResultData,
} from '@interfaces/models/integrity/huaweiIntegrityCheck'
import { AttestationHeadersParams, IntegrityChallengeService } from '@interfaces/services/integrity/integrityChallenge'

export default class HuaweiIntegrityCheckService implements IntegrityChallengeService {
    constructor(
        private readonly logger: Logger,
        private readonly externalEventBus: ExternalEventBus,
        private readonly integrityChallengeResultService: IntegrityChallengeResultService,
    ) {}

    async createIntegrityChallenge(userIdentifier: string, headers: AttestationHeadersParams): Promise<string> {
        const { mobileUid } = headers
        const { deletedCount }: { deletedCount?: number } = await huaweiIntegrityCheckModel.deleteMany({ mobileUid })

        this.logger.debug('Remove previous device integrity checks', { mobileUid, deletedCount })

        const integrityCheckData: HuaweiIntegrityCheck = {
            userIdentifier,
            mobileUid,
            nonce: Buffer.from(uuid()).toString('base64'),
            headers,
            checkStatus: HuaweiIntegrityCheckStatus.CheckCreated,
        }

        try {
            const attestation = await huaweiIntegrityCheckModel.create(integrityCheckData)

            return attestation.nonce
        } catch (e) {
            return utils.handleError(e, (err) => {
                if (err.getCode() === MongoDBErrorCode.DuplicateKey) {
                    const { keyValue } = <ApiError & { keyValue: Partial<GoogleIntegrityCheck> }>err
                    const duplicatedValues = keyValue

                    if (duplicatedValues.mobileUid) {
                        throw new AccessDeniedError('Nonce is already requested by a current device')
                    }
                }

                throw err
            })
        }
    }

    async launchIntegrityChallenge(userIdentifier: string, mobileUid: string, signedAttestationStatement: string): Promise<void> {
        const query: FilterQuery<GoogleIntegrityCheck> = {
            userIdentifier,
            mobileUid,
        }

        const integrityCheck = await huaweiIntegrityCheckModel.findOne(query)
        if (!integrityCheck) {
            throw new AccessDeniedError('Could not find integrity check entity')
        }

        integrityCheck.checkStatus = HuaweiIntegrityCheckStatus.CheckLaunched
        await integrityCheck.save()

        const { headers } = integrityCheck

        await this.externalEventBus.publish(ExternalEvent.AttestationHuaweiDevice, {
            uuid: uuid(),
            request: { userIdentifier, signedAttestationStatement, headers },
        })
    }

    async onHuaweiIntegrityCheckComplete(
        userIdentifier: string,
        headers: ActHeaders,
        integrityResultData?: HuaweiIntegrityResultData,
        error?: ExternalResponseEventError,
    ): Promise<void> {
        if (!integrityResultData) {
            return await this.integrityChallengeResultService.userFailedAttestation(userIdentifier, headers)
        }

        const { basicIntegrity } = integrityResultData
        const integrityCheck = await this.findIntegrityCheckModeByNonce(integrityResultData.nonce)

        integrityCheck.integrityResultData = integrityResultData
        integrityCheck.error = error

        let checkStatus = HuaweiIntegrityCheckStatus.CheckFailed
        if (basicIntegrity) {
            checkStatus = HuaweiIntegrityCheckStatus.CheckSucceeded
        }

        integrityCheck.checkStatus = checkStatus
        await integrityCheck.save()

        return await this.integrityChallengeResultService.completeAttestation(
            checkStatus === HuaweiIntegrityCheckStatus.CheckSucceeded,
            integrityCheck,
        )
    }

    private async findIntegrityCheckModeByNonce(nonce: string): Promise<HuaweiIntegrityCheckModel> {
        const query: FilterQuery<AttestationModel> = { nonce }
        const attestation = await huaweiIntegrityCheckModel.findOne(query)
        if (!attestation) {
            this.logger.fatal(`Could not find integrity check entity by a provided nonce: ${nonce}`)

            throw new ModelNotFoundError(huaweiIntegrityCheckModel.modelName, nonce)
        }

        return attestation
    }
}
