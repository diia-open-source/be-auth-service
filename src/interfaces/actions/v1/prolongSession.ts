import { UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        processId: string
    }
}

export interface ActionResult {
    token: string
}
