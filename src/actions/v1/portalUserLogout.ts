import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { asserts } from '@diia-inhouse/utils'

import RefreshTokenService from '@services/refreshToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/portalUserLogout'

export default class PortalUserLogoutAction implements AppAction {
    constructor(private readonly refreshTokenService: RefreshTokenService) {}

    readonly sessionType: SessionType = SessionType.PortalUser

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'portalUserLogout'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
        } = args

        asserts.isRefreshTokenExists(user)

        const { refreshToken, identifier: userIdentifier } = user

        return await this.refreshTokenService.logoutPortalUser(refreshToken, userIdentifier)
    }
}
