import { Model, Schema, model, models } from '@diia-inhouse/db'

import { HuaweiIntegrityCheck, HuaweiIntegrityCheckStatus } from '@interfaces/models/integrity/huaweiIntegrityCheck'

const huaweiIntegrityCheckSchema = new Schema<HuaweiIntegrityCheck>(
    {
        userIdentifier: { type: String, index: true, required: true },
        mobileUid: { type: String, unique: true, required: true },
        nonce: { type: String, unique: true, required: true },
        headers: { type: {}, required: true },
        integrityResultData: { type: {} },
        error: { type: {} },
        checkStatus: { type: String, required: true, enum: Object.values(HuaweiIntegrityCheckStatus) },
    },
    {
        timestamps: true,
    },
)

export const skipSyncIndexes = true

export default <Model<HuaweiIntegrityCheck>>models.HuaweiIntegrityCheck || model('HuaweiIntegrityCheck', huaweiIntegrityCheckSchema)
