import { GetSessionByIdRequest, SessionByIdResponse } from '@generated/auth'

import { ServiceActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends ServiceActionArguments {
    params: GetSessionByIdRequest
}

export type ActionResult = SessionByIdResponse
