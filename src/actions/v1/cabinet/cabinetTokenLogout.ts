import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import RefreshTokenService from '@services/refreshToken'

import { CustomActionArguments } from '@interfaces/actions/v2/tokenLogout'

export default class CabinetTokenLogoutAction implements AppAction {
    constructor(
        private readonly auth: AuthService,

        private readonly refreshTokenService: RefreshTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'cabinetTokenLogout'

    async handler({ headers }: CustomActionArguments): Promise<void> {
        const { mobileUid, token } = headers
        const sessionType: SessionType = SessionType.CabinetUser

        const user = await this.auth.validate(token, sessionType, mobileUid)

        return await this.refreshTokenService.logoutUser(user.refreshToken, mobileUid, user.identifier, sessionType)
    }
}
