import { ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        bearerToken: string
    }
}

export interface ActionResult {
    token: string
}
