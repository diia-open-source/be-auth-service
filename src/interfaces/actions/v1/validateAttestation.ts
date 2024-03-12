import { UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        nonce: string
        signedAttestationStatement: string
    }
}

export interface ActionResult {
    success: boolean
}
