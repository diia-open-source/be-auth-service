import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthStepsService from '@services/userAuthSteps'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/revokeSubmitAfterUserAuthSteps'
import { AuthSchemaCode } from '@interfaces/models/authSchema'

export default class RevokeSubmitAfterUserAuthStepsAction implements AppAction {
    constructor(private readonly userAuthStepsService: UserAuthStepsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'revokeSubmitAfterUserAuthSteps'

    readonly validationRules: ValidationSchema = { code: { type: 'string', enum: Object.values(AuthSchemaCode) } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { code, mobileUid, userIdentifier },
        } = args

        return await this.userAuthStepsService.revokeSubmitAfterUserAuthSteps({ code, mobileUid, userIdentifier })
    }
}
