import { ServiceUserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceUserActionArguments {
    params: {
        login: string
    }
}

export interface ActionResult {
    success: boolean
}
