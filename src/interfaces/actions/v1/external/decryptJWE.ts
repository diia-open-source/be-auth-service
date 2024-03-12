import { ServiceActionArguments, TokenData } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        data: unknown
    }
}

export type ActionResult = TokenData
