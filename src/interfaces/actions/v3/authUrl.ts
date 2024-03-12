import { AppUserActionHeaders, ServiceActionArguments, UserSession } from '@diia-inhouse/types'

import { AuthMethod } from '@interfaces/models/authSchema'
import { FaceLivenessDetectionConfigResponse } from '@interfaces/services/authSchema'

export interface CustomActionArguments extends ServiceActionArguments<AppUserActionHeaders> {
    params: {
        target: AuthMethod
        processId: string
        bankId?: string
        email?: string
        isLowRamDevice?: boolean
        builtInTrueDepthCamera?: boolean
    }
    session?: UserSession
}

export interface ActionResult {
    authUrl: string
    token?: string
    fld?: FaceLivenessDetectionConfigResponse
}
