import { ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        login: string
        password?: string
        twoFactorCode?: string
    }
}

export interface ActionResult {
    token: string
}
