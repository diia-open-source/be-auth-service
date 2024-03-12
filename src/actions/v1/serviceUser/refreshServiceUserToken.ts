import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/refreshServiceUserToken'

export default class RefreshServiceUserTokenAction implements AppAction {
    constructor(
        private readonly auth: AuthService,

        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.ServiceUser

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'refreshServiceUserToken'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            headers: { token },
        } = args

        const user = await this.auth.validate(token, SessionType.ServiceUser)

        const refreshUserToken: string = await this.userAuthTokenService.refreshServiceUserToken(user, user.refreshToken, user.exp)

        return { token: refreshUserToken }
    }
}
