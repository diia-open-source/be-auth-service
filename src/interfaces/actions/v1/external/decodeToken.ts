import { ServiceActionArguments, TokenData } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: {
        token: string
    }
}

export type ActionResult = TokenData
