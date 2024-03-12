import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import RefreshTokenService from '@services/refreshToken'
import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/refreshToken'

export default class RefreshEResidentApplicantTokenAction implements AppAction {
    constructor(
        private readonly auth: AuthService,

        private readonly refreshTokenService: RefreshTokenService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly sessionType = SessionType.EResidentApplicant

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name = 'refreshEResidentApplicantToken'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const { headers } = args
        const { token, mobileUid } = headers
        const sessionType = this.sessionType
        const user = await this.auth.validate(token, sessionType, mobileUid)
        const { refreshToken, identifier, exp } = user

        await this.refreshTokenService.validate(refreshToken.value, headers, { useProcessCode: true, userIdentifier: identifier })

        const newToken: string = await this.userAuthTokenService.refreshUserToken(user, refreshToken, headers, {}, exp)

        return { token: newToken }
    }
}
