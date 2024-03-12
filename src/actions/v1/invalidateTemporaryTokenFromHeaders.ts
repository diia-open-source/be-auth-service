import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import RefreshTokenService from '@services/refreshToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/invalidateTemporaryTokenFromHeaders'

export default class InvalidateTemporaryTokenFromHeadersAction implements AppAction {
    constructor(
        private readonly auth: AuthService,
        private readonly refreshTokenService: RefreshTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'invalidateTemporaryTokenFromHeaders'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            headers: { ticket: token },
        } = args

        const temporaryToken = await this.auth.validate(token, SessionType.Temporary)

        const { refreshToken, mobileUid } = temporaryToken

        const { value: refreshTokenValue } = refreshToken

        await this.refreshTokenService.validate(refreshTokenValue, { mobileUid })

        await this.refreshTokenService.invalidateTemporaryToken(refreshTokenValue, { mobileUid })

        // status field is needed for Transport HUB
        return { sessionId: mobileUid, status: 'ok' }
    }
}
