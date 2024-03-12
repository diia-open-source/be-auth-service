import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthService from '@services/auth'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/createBankIdAuthUrl'
import { AuthMethod } from '@interfaces/models/authSchema'

export default class CreateBankIdAuthUrlAction implements AppAction {
    constructor(private readonly authService: AuthService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'createBankIdAuthUrl'

    readonly validationRules: ValidationSchema = { bankId: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { bankId },
            headers,
        } = args

        const authUrl = await this.authService.getAuthUrl(AuthMethod.BankId, { bankId }, headers)

        return { authUrl }
    }
}
