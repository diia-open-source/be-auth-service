import { ServiceActionArguments, TemporaryActionHeaders } from '@diia-inhouse/types'

export type CustomActionArguments = ServiceActionArguments<TemporaryActionHeaders>

export interface ActionResult {
    token: string
}
