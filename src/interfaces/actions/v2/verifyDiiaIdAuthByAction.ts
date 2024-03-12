import { UserActionArguments } from '@diia-inhouse/types'

import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { DiiaIdAction } from '@interfaces/services/diiaId'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        target: AuthMethod
        requestId: string
        action: DiiaIdAction
    }
}

export interface ActionResult {
    processCode: ProcessCode
}
