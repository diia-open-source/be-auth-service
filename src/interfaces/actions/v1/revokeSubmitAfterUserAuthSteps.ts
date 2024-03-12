import { ServiceActionArguments } from '@diia-inhouse/types'

import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { RevokeSubmitAfterUserAuthStepsResult } from '@interfaces/services/userAuthSteps'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        code: AuthSchemaCode
        userIdentifier: string
        mobileUid: string
    }
}

export type ActionResult = RevokeSubmitAfterUserAuthStepsResult
