import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, PublicServiceKebabCaseCode, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthStepsService from '@services/userAuthSteps'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v3/getAuthMethods'
import { AuthSchemaCode } from '@interfaces/models/authSchema'

export default class GetAuthMethodsAction implements AppAction {
    constructor(private readonly userAuthStepsService: UserAuthStepsService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V3

    readonly name = 'getAuthMethods'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        code: { type: 'string', enum: [...Object.values(AuthSchemaCode), ...Object.values(PublicServiceKebabCaseCode)] },
        processId: { type: 'string', optional: true },
    }

    getLockResource(args: CustomActionArguments): string {
        const {
            headers: { mobileUid },
        } = args

        return `user-auth-steps-${mobileUid}`
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { code, processId },
            headers,
            session,
        } = args

        return await this.userAuthStepsService.getAuthMethods(code, headers, processId, session?.user)
    }
}
