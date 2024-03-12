import { AppUserActionHeaders, HttpStatusCode } from '@diia-inhouse/types'

export interface GetUserDataParams {
    statusCode?: HttpStatusCode
    itn?: string
    headers?: AppUserActionHeaders
    requestId?: string
    nfc?: {
        token: string
        photoVerificationResult?: boolean
    }
}

export declare class AuthMockProvider {
    requestAuthorizationUrl(): Promise<void>
    getUserData(params?: GetUserDataParams): Promise<void>
    getSpecificParams(): Record<string, string>
}
