import { Document } from '@diia-inhouse/db'

import { FaceRecoMatchedPhoto } from '@interfaces/externalEventListeners/faceRecoAuthPhotoVerification'

export interface PhotoIdAuthRequest {
    userIdentifier: string
    mobileUid: string
    requestId: string
    expirationDate: Date
    isIdentificationSuccess?: boolean
    identificationResult?: FaceRecoMatchedPhoto[]
}

export interface PhotoIdAuthRequestModel extends PhotoIdAuthRequest, Document {}
