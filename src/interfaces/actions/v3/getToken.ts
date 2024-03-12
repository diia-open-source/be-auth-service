import { AppUserActionHeaders, ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments<AppUserActionHeaders> {
    params: {
        processId: string
    }
}

export interface ActionResult {
    token: string
    channelUuid: string
}
