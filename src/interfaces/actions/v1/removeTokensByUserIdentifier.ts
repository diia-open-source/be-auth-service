import { RemoveTokensByUserIdentifierRequest } from '@generated/auth'

import { ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: RemoveTokensByUserIdentifierRequest
}

export type ActionResult = void
