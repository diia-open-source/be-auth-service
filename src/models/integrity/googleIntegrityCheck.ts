import { Model, Schema, model, models } from '@diia-inhouse/db'

import { GoogleIntegrityCheck, GoogleIntegrityCheckStatus } from '@interfaces/models/integrity/googleIntegrityCheck'

const googleIntegrityCheckSchema = new Schema<GoogleIntegrityCheck>(
    {
        userIdentifier: { type: String, index: true, required: true },
        mobileUid: { type: String, unique: true, required: true },
        nonce: { type: String, unique: true, required: true },
        headers: { type: {}, required: true },
        integrityResultData: { type: {} },
        error: { type: {} },
        checkStatus: { type: String, required: true, enum: Object.values(GoogleIntegrityCheckStatus) },
    },
    {
        timestamps: true,
    },
)

export const skipSyncIndexes = true

export default <Model<GoogleIntegrityCheck>>models.GoogleIntegrityCheck || model('GoogleIntegrityCheck', googleIntegrityCheckSchema)
