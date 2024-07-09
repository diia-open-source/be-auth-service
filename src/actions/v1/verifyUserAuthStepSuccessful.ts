import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthStepsService from '@services/userAuthSteps'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/verifyUserAuthStepSuccessful'

export default class VerifyUserAuthStepSuccessful implements AppAction {
    constructor(private readonly userAuthStepsService: UserAuthStepsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'verifyUserAuthStepSuccessful'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        schemaCode: { type: 'string' },
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
