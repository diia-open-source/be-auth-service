import { AppUserActionHeaders, ServiceActionArguments } from '@diia-inhouse/types'

export type CustomActionArguments = ServiceActionArguments<AppUserActionHeaders>

export interface ActionResult {
    token: string
}
