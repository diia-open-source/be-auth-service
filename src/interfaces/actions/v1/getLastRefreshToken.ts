import { ServiceActionArguments } from '@diia-inhouse/types'

import { GetLastRefreshTokenReq, GetLastRefreshTokenRes } from '@src/generated'

export interface CustomActionArguments extends ServiceActionArguments {
    params: GetLastRefreshTokenReq
}

export type ActionResult = GetLastRefreshTokenRes
