import { AppUserActionHeaders, ServiceActionArguments, UserSession } from '@diia-inhouse/types'

import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { MrzPayload, QesPayload, QrCodePayload } from '@interfaces/services/userAuthSteps'

export interface CustomActionArguments extends ServiceActionArguments<AppUserActionHeaders> {
    params: {
        method: AuthMethod
        requestId: string
        processId: string
        bankId?: string
        qrCodePayload?: QrCodePayload
        mrzPayload?: MrzPayload
        qesPayload?: QesPayload
        otp?: string
    }
    session?: UserSession
}

export interface ActionResult {
    processCode: ProcessCode
}
