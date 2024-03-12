import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, PublicServiceKebabCaseCode, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthStepsService from '@services/userAuthSteps'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/verifyUserAuthStepSuccessful'
import { AuthSchemaCode } from '@interfaces/models/authSchema'

export default class VerifyUserAuthStepSuccessful implements AppAction {
    constructor(private readonly userAuthStepsService: UserAuthStepsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'verifyUserAuthStepSuccessful'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        schemaCode: { type: 'string', enum: [...Object.values(AuthSchemaCode), ...Object.values(PublicServiceKebabCaseCode)] },
        processId: { type: 'string' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { schemaCode, processId },
            session: {
                user: { identifier: userIdentifier },
            },
            headers: { mobileUid },
        } = args

        await this.userAuthStepsService.verifyUserAuthStepSuccessful({ code: schemaCode, processId, mobileUid, userIdentifier })
    }
}
