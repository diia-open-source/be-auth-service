import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import SessionService from '@services/session'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getUserSessionById'

export default class GetUserSessionByIdAction implements AppAction {
    constructor(private readonly sessionService: SessionService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getUserSessionById'

    readonly validationRules: ValidationSchema = { id: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { id },
            session: { user },
        } = args

        return await this.sessionService.getUserSessionById(user, id)
    }
}
