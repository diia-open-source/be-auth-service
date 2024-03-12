import { CompleteUserAuthStepsRequest } from '@generated/auth'

import { UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: CompleteUserAuthStepsRequest
}

export type ActionResult = void
