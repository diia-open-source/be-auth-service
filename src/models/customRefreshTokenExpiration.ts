import { Model, Schema, model, models } from '@diia-inhouse/db'
import { PlatformType } from '@diia-inhouse/types'

import { CustomRefreshTokenExpiration } from '@interfaces/models/customRefreshTokenExpiration'

const customRefreshTokenExpirationSchema = new Schema<CustomRefreshTokenExpiration>(
    {
        platformType: { type: String, enum: Object.values(PlatformType), required: true },
        appVersion: { type: String, required: true },
        expiration: { type: Number, required: true },
    },
    {
        timestamps: true,
    },
)

customRefreshTokenExpirationSchema.index({ platformType: 1, appVersion: 1 }, { unique: true })

export default <Model<CustomRefreshTokenExpiration>>models.CustomRefreshTokenExpiration ||
    model('CustomRefreshTokenExpiration', customRefreshTokenExpirationSchema)
