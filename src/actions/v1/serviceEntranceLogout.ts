import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import RefreshTokenService from '@services/refreshToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/serviceEntranceLogout'

export default class ServiceEntranceLogoutAction implements AppAction {
    constructor(
        private readonly auth: AuthService,

        private readonly refreshTokenService: RefreshTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'serviceEntranceLogout'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const { mobileUid, token } = args.headers

        const user = await this.auth.validate(token, SessionType.ServiceEntrance, mobileUid)

        return await this.refreshTokenService.serviceEntranceLogout(user.refreshToken, mobileUid)
    }
}
