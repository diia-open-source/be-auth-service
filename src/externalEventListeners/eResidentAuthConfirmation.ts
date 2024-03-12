import { EventBusListener, ExternalEvent } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

export default class EResidentAuthConfirmationExternalEventListener implements EventBusListener {
    readonly event: ExternalEvent = ExternalEvent.EResidentAuthConfirmation

    readonly isSync: boolean = true

    readonly validationRules: ValidationSchema = {
        http_code: { type: 'number' },
        message: { type: 'string' },
    }
}
