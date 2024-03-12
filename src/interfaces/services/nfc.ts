export interface VerifyPhotoResult {
    verified: boolean
}

export interface AuthGetInnByUnzrRequest {
    person_unzr: string
    representative_firstname: string
    representative_lastname: string
    representative_document: string
}

export interface AuthGetInnByUnzrResponse {
    rnokpp: string
    firstname: string
    lastname: string
    middlename?: string
}

export interface NfcVerificationRequest {
    uuid: string
    request: {
        mobileUid: string
        token: string
    }
}
