import { AppUserActionHeaders, ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments<AppUserActionHeaders> {
    params: {
        otp: string
    }
}

export interface ActionResult {
    token: string
}
