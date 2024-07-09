import { AppUserActionHeaders, ServiceActionArguments, UserSession } from '@diia-inhouse/types'

import { AuthMethodsResponse } from '@interfaces/services/userAuthSteps'

export interface CustomActionArguments extends ServiceActionArguments<AppUserActionHeaders> {
    params: {
        code: string
        processId?: string
    }
    session?: UserSession
}

export type ActionResult = AuthMethodsResponse
