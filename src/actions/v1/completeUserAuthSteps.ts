import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthStepsService from '@services/userAuthSteps'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/completeUserAuthSteps'
import { SchemaCode } from '@interfaces/services/userAuthSteps'

export default class CompleteUserAuthStepsAction implements GrpcAppAction {
    constructor(private readonly userAuthStepsService: UserAuthStepsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'completeUserAuthSteps'

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

        await this.userAuthStepsService.completeSteps({ code: <SchemaCode>schemaCode, processId, mobileUid, userIdentifier })
    }
}
