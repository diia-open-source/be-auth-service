import { EventBusListener } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

import { ExternalEvent } from '@interfaces/application'

export default class EResidentAuthConfirmationExternalEventListener implements EventBusListener {
    readonly event: ExternalEvent = ExternalEvent.EResidentAuthConfirmation

    readonly isSync: boolean = true

    readonly validationRules: ValidationSchema = {
        http_code: { type: 'number' },
        message: { type: 'string' },
    }
}
