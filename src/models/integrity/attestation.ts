import { Model, Schema, model, models } from '@diia-inhouse/db'

import { Attestation } from '@interfaces/models/integrity/attestation'

const attestationSchema = new Schema<Attestation>(
    {
        userIdentifier: { type: String, index: true, required: true },
        mobileUid: { type: String, unique: true, required: true },
        nonce: { type: String, unique: true, required: true },
        headers: { type: {}, required: true },
        ctsProfileMatch: { type: Boolean },
        resultData: { type: {} },
        error: { type: {} },
    },
    {
        timestamps: true,
    },
)

export const skipSyncIndexes = true

export default <Model<Attestation>>models.Attestation || model('Attestation', attestationSchema)
