import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import RefreshTokenService from '@services/refreshToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/invalidateTemporaryToken'

export default class InvalidateTemporaryTokenAction implements AppAction {
    constructor(
        private readonly auth: AuthService,
        private readonly refreshTokenService: RefreshTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'invalidateTemporaryToken'

    readonly validationRules: ValidationSchema = { ticket: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { ticket: token },
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
