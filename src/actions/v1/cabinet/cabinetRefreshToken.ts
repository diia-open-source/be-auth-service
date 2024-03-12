import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import RefreshTokenService from '@services/refreshToken'
import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/refreshToken'

export default class CabinetRefreshTokenAction implements AppAction {
    constructor(
        private readonly auth: AuthService,

        private readonly refreshTokenService: RefreshTokenService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'cabinetRefreshToken'

    async handler({ headers }: CustomActionArguments): Promise<ActionResult> {
        const { token, mobileUid } = headers

        const user = await this.auth.validate(token, SessionType.CabinetUser, mobileUid)

        const { refreshToken, identifier, exp } = user

        await this.refreshTokenService.validate(refreshToken.value, headers, { useProcessCode: true, userIdentifier: identifier })

        const newToken = await this.userAuthTokenService.refreshUserToken(user, refreshToken, headers, {}, exp)

        return { token: newToken }
    }
}
