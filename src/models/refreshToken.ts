import { Model, Schema, model, models } from 'mongoose'

import { AuthDocumentType, AuthEntryPoint, PlatformType, SessionType } from '@diia-inhouse/types'

import { AuthEntryPointHistory, RefreshToken } from '@interfaces/models/refreshToken'

const authEntryPointSchema = new Schema<AuthEntryPoint>(
    {
        target: { type: String, required: true },
        isBankId: { type: Boolean, required: true },
        bankName: { type: String },
        document: { type: String, enum: Object.values(AuthDocumentType) },
    },
    {
        _id: false,
    },
)

const authEntryPointHistorySchema = new Schema<AuthEntryPointHistory>(
    {
        authEntryPoint: { type: authEntryPointSchema, required: true },
        date: { type: Date, required: true },
    },
    {
        _id: false,
    },
)

const refreshTokenSchema = new Schema<RefreshToken>(
    {
        value: { type: String, required: true },
        expirationTime: { type: Number, required: true },
        sessionType: { type: String, enum: Object.values(SessionType), index: true, required: true },
        eisTraceId: { type: String, index: true, required: true },
        mobileUid: { type: String, index: true },
        authEntryPoint: { type: authEntryPointSchema },
        authEntryPointHistory: { type: [authEntryPointHistorySchema], default: [], required: true },
        expired: { type: Boolean },
        isCompromised: { type: Boolean },
        entityId: { type: String, index: true },
        userIdentifier: { type: String, index: true },
        platformType: { type: String, enum: Object.values(PlatformType) },
        platformVersion: { type: String },
        appVersion: { type: String },
        isDeleted: { type: Boolean },
        login: { type: String, index: true },
        lastActivityDate: { type: Date },
        isLoadTestPeriod: { type: Boolean },
        expirationDate: { type: Date },
    },
    {
        timestamps: true,
    },
)

refreshTokenSchema.index({ value: 1, mobileUid: 1 }, { unique: true })
refreshTokenSchema.index({ isDeleted: 1, expired: 1, mobileUid: 1, expirationTime: 1 })
refreshTokenSchema.index(
    {
        createdAt: 1,
    },
    {
        expireAfterSeconds: 86400,
        partialFilterExpression: { sessionType: SessionType.Temporary },
    },
)
refreshTokenSchema.index(
    { expirationDate: 1 },
    {
        expireAfterSeconds: 0,
    },
)

export const skipSyncIndexes = true

export default <Model<RefreshToken>>models.RefreshToken || model('RefreshToken', refreshTokenSchema)
