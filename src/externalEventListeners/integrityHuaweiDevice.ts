import { EventBusListener } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

import HuaweiIntegrityCheckService from '@services/integrity/huaweiCheck'

import { ExternalEvent } from '@interfaces/application'
import { EventPayload } from '@interfaces/externalEventListeners/integrityHuaweiDevice'

export default class IntegrityHuaweiDeviceEventListener implements EventBusListener {
    constructor(private readonly integrityHuaweiCheckService: HuaweiIntegrityCheckService) {}

    readonly event: ExternalEvent = ExternalEvent.AttestationHuaweiDevice

    readonly validationRules: ValidationSchema = {
        uuid: { type: 'string' },
        response: {
            type: 'object',
            optional: true,
            props: {
                headers: { type: 'object' },
                userIdentifier: { type: 'string' },
                integrityResultData: {
                    type: 'object',
                    optional: true,
                    props: {
                        advice: { type: 'string', optional: true },
                        apkCertificateDigestSha256: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        apkDigestSha256: { type: 'string' },
                        apkPackageName: { type: 'string' },
                        appId: { type: 'string' },
                        basicIntegrity: { type: 'boolean' },
                        detail: {
                            type: 'array',
                            items: { type: 'string' },
                            optional: true,
                        },
                        nonce: { type: 'string' },
                        timestampMs: { type: 'number' },
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
            },
        },
    }

    async handler(message: EventPayload): Promise<void> {
        const { response, error } = message

        if (response) {
            const { userIdentifier, headers, integrityResultData } = response

            await this.integrityHuaweiCheckService.onHuaweiIntegrityCheckComplete(userIdentifier, headers, integrityResultData, error)
        }
    }
}
