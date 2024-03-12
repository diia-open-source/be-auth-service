import { ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        processId: string
    }
}

export interface ActionResult {
    token: string
    channelUuid: string
}
