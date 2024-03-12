import { EventBusListener, ExternalEvent } from '@diia-inhouse/diia-queue'
import { BadRequestError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import NfcService from '@services/nfc'
import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'
import RefreshTokenService from '@services/refreshToken'

import { EventPayload } from '@interfaces/externalEventListeners/faceRecoAuthPhotoVerification'

export default class FaceRecoAuthPhotoVerificationEventListener implements EventBusListener {
    constructor(
        private readonly logger: Logger,

        private readonly nfcService: NfcService,
        private readonly photoIdAuthRequestService: PhotoIdAuthRequestService,
        private readonly refreshTokenService: RefreshTokenService,
    ) {}

    readonly event: ExternalEvent = ExternalEvent.FaceRecoAuthPhotoVerification

    readonly validationRules: ValidationSchema = {
        uuid: { type: 'string' },
        response: {
            type: 'object',
            optional: true,
            props: {
                requestId: { type: 'uuid' },
                documents: {
                    type: 'array',
                    items: {
                        type: 'object',
                        props: {
                            documentIdentifier: { type: 'string' },
                            documentType: { type: 'string' },
                            matched: { type: 'boolean' },
                        },
                    },
                },
            },
        },
        error: {
            type: 'object',
            optional: true,
            props: {
                message: { type: 'string' },
                http_code: { type: 'number' },
            },
        },
    }

    async handler(message: EventPayload): Promise<void> {
        const { uuid: traceId, response, error } = message

        if (error || !response) {
            throw new BadRequestError('Error on user photo verification', { error })
        }

        const { requestId, documents } = response

        const areWeInNfcScanFlow = await this.nfcService.nfcUserDataExists(requestId)
        if (areWeInNfcScanFlow) {
            if (!(await this.refreshTokenService.isExists(traceId, requestId))) {
                this.logger.error('Failed to find refresh token by traceId', { traceId })

                return
            }

            const docMatch = documents[0].matched

            await this.nfcService.saveUserPhotoVerificationResult(requestId, docMatch)
            this.logger.info('Successfully saved verification result', { requestId, docMatch })

            return
        }

        await this.photoIdAuthRequestService.markRequestAsIdentified(requestId, documents)
    }
}
