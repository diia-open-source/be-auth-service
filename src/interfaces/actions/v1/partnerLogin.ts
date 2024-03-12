import { ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        token: string
    }
}

export interface ActionResult {
    token: string
}
