import { GetUserOpenIdDataRequest, UserOpenIdData } from '@generated/auth'

import { ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: GetUserOpenIdDataRequest
}

export type ActionResult = UserOpenIdData
