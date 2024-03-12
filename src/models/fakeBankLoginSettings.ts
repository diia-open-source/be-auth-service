import { Model, Schema, model, models } from 'mongoose'

import { PlatformType } from '@diia-inhouse/types'

import { FakeBankLoginSettings } from '@interfaces/models/fakeBankLoginSettings'
import { Bank } from '@interfaces/services/bank'

const appVersionsSchema = new Schema<Partial<Record<PlatformType, string>>>(
    {
        [PlatformType.Android]: { type: String },
        [PlatformType.Huawei]: { type: String },
        [PlatformType.iOS]: { type: String },
    },
    {
        _id: false,
    },
)

const bankSchema = new Schema<Bank>(
    {
        name: { type: String, required: true },
        logoUrl: { type: String, required: true },
        workable: { type: Boolean, required: true },
        bankId: { type: String, required: true },
        memberId: { type: String, required: true },
        sortOrder: { type: Number, required: true },
    },
    {
        _id: false,
    },
)

const fakeBankLoginSettingsSchema = new Schema<FakeBankLoginSettings>(
    {
        isActive: { type: Boolean, required: true },
        bank: { type: bankSchema, required: true },
        authorizationUrl: { type: String, required: true },
        requestId: { type: String, required: true },
        bankIdUser: { type: {}, required: true },
        appVersions: { type: appVersionsSchema, required: true },
    },
    {
        timestamps: true,
    },
)

export default <Model<FakeBankLoginSettings>>models.FakeBankLoginSettings || model('FakeBankLoginSettings', fakeBankLoginSettingsSchema)
