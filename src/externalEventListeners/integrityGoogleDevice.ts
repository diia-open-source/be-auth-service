import { EventBusListener, ExternalEvent } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

import GoogleIntegrityCheckService from '@services/integrity/googleCheck'

import { EventPayload } from '@interfaces/externalEventListeners/integrityGoogleDevice'

export default class IntegrityGoogleDeviceEventListener implements EventBusListener {
    constructor(private readonly integrityGoogleCheckService: GoogleIntegrityCheckService) {}

    readonly event: ExternalEvent = ExternalEvent.IntegrityGoogleDevice

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
                        requestDetails: {
                            type: 'object',
                            props: {
                                requestPackageName: { type: 'string' },
                                nonce: { type: 'string' },
                                timestampMillis: { type: 'number' },
                            },
                        },
                        appIntegrity: {
                            type: 'object',
                            props: {
                                appRecognitionVerdict: { type: 'string' },
                                packageName: { type: 'string', optional: true },
                                certificateSha256Digest: { type: 'array', items: { type: 'string' }, optional: true },
                                versionCode: { type: 'number' },
                            },
                        },
                        deviceIntegrity: {
                            type: 'object',
                            props: {
                                deviceRecognitionVerdict: { type: 'array', items: { type: 'string' } },
                            },
                        },
                        accountDetails: {
                            type: 'object',
                            props: {
                                appLicensingVerdict: { type: 'string', optional: true },
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
            },
        },
    }

    async handler(message: EventPayload): Promise<void> {
        const { response, error } = message

        if (response) {
            const { userIdentifier, headers, integrityResultData } = response

            await this.integrityGoogleCheckService.onGoogleIntegrityCheckComplete(userIdentifier, headers, integrityResultData, error)
        }
    }
}
