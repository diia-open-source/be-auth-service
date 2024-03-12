import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, EResidentApplicantTokenData, EResidentTokenData, SessionType } from '@diia-inhouse/types'

import RefreshTokenService from '@services/refreshToken'

import { CustomActionArguments } from '@interfaces/actions/v2/tokenLogout'

export default class TokenEResidentLogoutAction implements AppAction {
    constructor(
        private readonly auth: AuthService,

        private readonly refreshTokenService: RefreshTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name = 'tokenEResidentLogout'

    async handler(args: CustomActionArguments): Promise<void> {
        const { headers } = args
        const { mobileUid, token } = headers

        const { refreshToken, identifier, sessionType, exp } = await this.auth.validate<EResidentTokenData | EResidentApplicantTokenData>(
            token,
            [SessionType.EResident, SessionType.EResidentApplicant],
            mobileUid,
        )

        return await this.refreshTokenService.logoutUser(refreshToken, mobileUid, identifier, sessionType, exp)
    }
}
