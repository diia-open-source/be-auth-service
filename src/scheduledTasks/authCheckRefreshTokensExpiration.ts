import { EventBusListener } from '@diia-inhouse/diia-queue'

import RefreshTokenService from '@services/refreshToken'

import { ScheduledTaskEvent } from '@interfaces/application'

export default class AuthCheckRefreshTokensExpirationScheduledTask implements EventBusListener {
    constructor(private refreshTokenService: RefreshTokenService) {}

    readonly event: ScheduledTaskEvent = ScheduledTaskEvent.AuthCheckRefreshTokensExpiration

    async handler(): Promise<void> {
        await this.refreshTokenService.checkRefreshTokensExpiration()
    }
}
