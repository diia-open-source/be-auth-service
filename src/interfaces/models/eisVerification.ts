import { Document } from '@diia-inhouse/db'

export interface EisVerification {
    userIdentifier: string
    uuid: string
    isVerified?: boolean
}

export interface EisVerificationModel extends EisVerification, Document {}
