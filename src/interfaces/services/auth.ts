import { AppUserActionHeaders, UserTokenData } from '@diia-inhouse/types'

import { MrzPayload, QesPayload, QrCodePayload } from '@interfaces/services/userAuthSteps'

export interface AuthUrlOps {
    userIdentifier?: string
    bankId?: string
    email?: string
}

export type AuthProviderHeaders = AppUserActionHeaders

export interface AuthMethodVerifyParams {
    headers: AuthProviderHeaders
    bankId?: string
    qrCodePayload?: QrCodePayload
    mrzPayload?: MrzPayload
    qesPayload?: QesPayload
    otp?: string
    user?: UserTokenData
}
