import { EventBusListener, ExternalEvent } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

import AttestationService from '@services/integrity/attestation'

import { EventPayload } from '@interfaces/externalEventListeners/attestationGoogleDevice'

export default class AttestationGoogleDeviceEventListener implements EventBusListener {
    constructor(private readonly integrityAttestationService: AttestationService) {}

    readonly event: ExternalEvent = ExternalEvent.AttestationGoogleDevice

    readonly validationRules: ValidationSchema = {
        uuid: { type: 'string' },
        response: {
            type: 'object',
            optional: true,
            props: {
                nonce: { type: 'string' },
                ctsProfileMatch: { type: 'boolean' },
                apkCertificateDigestSha256: { type: 'array', items: { type: 'string' }, optional: true },
                apkDigestSha256: { type: 'string', optional: true },
                apkPackageName: { type: 'string', optional: true },
                basicIntegrity: { type: 'boolean', optional: true },
                timestampMs: { type: 'number', optional: true },
                evaluationType: { type: 'string', optional: true },
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
        const { response, error } = message
        const { nonce, ctsProfileMatch, ...restData } = response!

        await this.integrityAttestationService.onSafetyNetAttestationComplete(nonce, ctsProfileMatch, { ...restData }, error)
    }
}
