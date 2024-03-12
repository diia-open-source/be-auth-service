import { PortalUser, ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: PortalUser
}

export interface ActionResult {
    token: string
}
