import { EventBusListener, ExternalEvent } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

export default class AuthNfcInnByUnzr implements EventBusListener {
    readonly event: ExternalEvent = ExternalEvent.AuthGetInnByUnzr

    readonly validationRules: ValidationSchema = {
        rnokpp: { type: 'string' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        middlename: { type: 'string', optional: true },
    }

    readonly isSync: boolean = true
}
