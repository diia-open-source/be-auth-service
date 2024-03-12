import { AppUserActionHeaders, ServiceActionArguments } from '@diia-inhouse/types'

interface ActionHeaders extends AppUserActionHeaders {
    token: string
}

export type CustomActionArguments = ServiceActionArguments<ActionHeaders>

export interface ActionResult {
    token: string
}
