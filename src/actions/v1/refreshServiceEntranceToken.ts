import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import RefreshTokenService from '@services/refreshToken'
import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/refreshServiceEntranceToken'

export default class RefreshServiceEntranceTokenAction implements AppAction {
    constructor(
        private readonly auth: AuthService,

        private readonly refreshTokenService: RefreshTokenService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'refreshServiceEntranceToken'

    async handler({ headers }: CustomActionArguments): Promise<ActionResult> {
        const { token, mobileUid } = headers

        const user = await this.auth.validate(token, SessionType.ServiceEntrance, mobileUid)

        await this.refreshTokenService.validate(user.refreshToken.value, headers)

        const refreshUserToken: string = await this.userAuthTokenService.refreshServiceEntranceToken(user, user.refreshToken, user.exp)

        return { token: refreshUserToken }
    }
}
