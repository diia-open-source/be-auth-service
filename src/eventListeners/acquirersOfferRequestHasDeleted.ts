import { EventBusListener } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthTokenService from '@services/authToken'

import { InternalEvent } from '@interfaces/application'
import { EventPayload } from '@interfaces/eventListeners/acquirersOfferRequestHasDeleted'

export default class AcquirersOfferRequestHasDeletedEventListener implements EventBusListener {
    constructor(private readonly authTokenService: AuthTokenService) {}

    readonly event: InternalEvent = InternalEvent.AcquirersOfferRequestHasDeleted

    readonly validationRules: ValidationSchema = {
        offerRequestHashId: { type: 'string' },
    }

    async handler(message: EventPayload): Promise<void> {
        const { offerRequestHashId } = message

        await this.authTokenService.deleteEntitiesByOfferRequestHashId(offerRequestHashId)
    }
}
