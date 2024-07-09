import { EventBusListener } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

import RefreshTokenService from '@services/refreshToken'

import { InternalEvent } from '@interfaces/application'
import { EventPayload } from '@interfaces/eventListeners/gatewayUserActivity'

export default class GatewayUserActivityEventListener implements EventBusListener {
    constructor(private readonly refreshTokenService: RefreshTokenService) {}

    readonly event: InternalEvent = InternalEvent.GatewayUserActivity

    readonly validationRules: ValidationSchema = {
        userIdentifier: { type: 'string' },
        mobileUid: { type: 'string' },
    }

    async handler(message: EventPayload): Promise<void> {
        const { userIdentifier, mobileUid } = message

        await this.refreshTokenService.updateActivity(userIdentifier, mobileUid)
    }
}
