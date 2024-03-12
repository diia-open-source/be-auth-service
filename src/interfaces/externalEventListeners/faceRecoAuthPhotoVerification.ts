import { ExternalResponseBaseEventPayload } from '@interfaces/externalEventListeners'
import { FeaturePoints } from '@interfaces/services/user'

export interface FaceRecoAuthPhotoVerificationRequest {
    requestId: string
    documents: FeaturePoints[]
    matchKoef?: number
}

export interface FaceRecoMatchedPhoto {
    documentIdentifier: string
    documentType: string
    matched: boolean
}

export interface EventPayload extends ExternalResponseBaseEventPayload {
    response?: {
        requestId: string
        documents: FaceRecoMatchedPhoto[]
    }
}
