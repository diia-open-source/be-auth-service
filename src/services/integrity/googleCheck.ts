import { FilterQuery } from 'mongoose'
import { v4 as uuid } from 'uuid'

import { MongoDBErrorCode } from '@diia-inhouse/db'
import { ExternalEvent, ExternalEventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, ApiError, ModelNotFoundError } from '@diia-inhouse/errors'
import { ActHeaders, Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import IntegrityChallengeResultService from '@services/integrity/challengeResult'

import googleIntegrityCheckModel from '@models/integrity/googleIntegrityCheck'

import { ExternalResponseEventError } from '@interfaces/externalEventListeners'
import { AttestationModel } from '@interfaces/models/integrity/attestation'
import {
    GoogleIntegrityCheck,
    GoogleIntegrityCheckModel,
    GoogleIntegrityCheckStatus,
    IntegrityResultData,
} from '@interfaces/models/integrity/googleIntegrityCheck'
import { AttestationHeadersParams, IntegrityChallengeService } from '@interfaces/services/integrity/integrityChallenge'

export default class GoogleIntegrityCheckService implements IntegrityChallengeService {
    constructor(
        private readonly logger: Logger,
        private readonly externalEventBus: ExternalEventBus,
        private readonly integrityChallengeResultService: IntegrityChallengeResultService,
    ) {}

    async createIntegrityChallenge(userIdentifier: string, headers: AttestationHeadersParams): Promise<string> {
        const { mobileUid } = headers
        const { deletedCount }: { deletedCount?: number } = await googleIntegrityCheckModel.deleteMany({ mobileUid })

        this.logger.debug('Remove previous device integrity checks', { mobileUid, deletedCount })

        const integrityCheckData: GoogleIntegrityCheck = {
            userIdentifier,
            mobileUid,
            nonce: Buffer.from(uuid()).toString('base64'),
            headers,
            checkStatus: GoogleIntegrityCheckStatus.CheckCreated,
        }

        try {
            const attestation = await googleIntegrityCheckModel.create(integrityCheckData)

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

        const integrityCheck = await googleIntegrityCheckModel.findOne(query)
        if (!integrityCheck) {
            throw new AccessDeniedError('Could not find integrity check entity')
        }

        integrityCheck.checkStatus = GoogleIntegrityCheckStatus.CheckLaunched
        await integrityCheck.save()

        const { headers } = integrityCheck

        await this.externalEventBus.publish(ExternalEvent.IntegrityGoogleDevice, {
            uuid: uuid(),
            request: { userIdentifier, signedAttestationStatement, headers },
        })
    }

    async onGoogleIntegrityCheckComplete(
        userIdentifier: string,
        headers: ActHeaders,
        integrityResultData?: IntegrityResultData,
        error?: ExternalResponseEventError,
    ): Promise<void> {
        if (!integrityResultData) {
            return await this.integrityChallengeResultService.userFailedAttestation(userIdentifier, headers)
        }

        const { requestDetails, deviceIntegrity, appIntegrity, accountDetails } = integrityResultData
        const integrityCheck = await this.findIntegrityCheckModeByNonce(requestDetails.nonce)

        integrityCheck.integrityResultData = integrityResultData
        integrityCheck.error = error

        let checkStatus = GoogleIntegrityCheckStatus.CheckFailed
        if (
            deviceIntegrity.deviceRecognitionVerdict.includes('MEETS_STRONG_INTEGRITY') &&
            appIntegrity.appRecognitionVerdict === 'PLAY_RECOGNIZED' &&
            accountDetails.appLicensingVerdict === 'LICENSED'
        ) {
            checkStatus = GoogleIntegrityCheckStatus.CheckSucceeded
        }

        integrityCheck.checkStatus = checkStatus
        await integrityCheck.save()

        return await this.integrityChallengeResultService.completeAttestation(
            checkStatus === GoogleIntegrityCheckStatus.CheckSucceeded,
            integrityCheck,
        )
    }

    private async findIntegrityCheckModeByNonce(nonce: string): Promise<GoogleIntegrityCheckModel> {
        const query: FilterQuery<AttestationModel> = { nonce }
        const attestation = await googleIntegrityCheckModel.findOne(query)
        if (!attestation) {
            this.logger.fatal(`Could not find integrity check entity by a provided nonce: ${nonce}`)

            throw new ModelNotFoundError(googleIntegrityCheckModel.modelName, nonce)
        }

        return attestation
    }
}
