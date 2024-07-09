import { Model, Schema, model, models } from '@diia-inhouse/db'

import { FaceRecoMatchedPhoto } from '@interfaces/externalEventListeners/faceRecoAuthPhotoVerification'
import { PhotoIdAuthRequest } from '@interfaces/models/photoIdAuthRequest'

const identificationResultItemSchema = new Schema<FaceRecoMatchedPhoto>(
    {
        documentIdentifier: { type: String, required: true },
        documentType: { type: String, required: true },
        matched: { type: Boolean, required: true },
    },
    {
        _id: false,
    },
)

const photoIdAuthRequestSchema = new Schema<PhotoIdAuthRequest>(
    {
        userIdentifier: { type: String, required: true },
        mobileUid: { type: String, unique: true, required: true },
        requestId: { type: String, unique: true, required: true },
        expirationDate: { type: Date, required: true },
        isIdentificationSuccess: { type: Boolean },
        identificationResult: { type: [identificationResultItemSchema] },
    },
    {
        timestamps: true,
    },
)

photoIdAuthRequestSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 })

export default <Model<PhotoIdAuthRequest>>models.PhotoIdAuthRequest || model('PhotoIdAuthRequest', photoIdAuthRequestSchema)
