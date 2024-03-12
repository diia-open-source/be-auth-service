import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthTokenService from '@services/authToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/acquirerLogin'

export default class AcquirerLoginAction implements AppAction {
    constructor(private readonly authTokenService: AuthTokenService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'acquirerLogin'

    readonly validationRules: ValidationSchema = { token: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const token: string = await this.authTokenService.getAcquirerAuthToken(args.params.token, args.headers.traceId)

        return { token }
    }
}
