import { Model, Schema, model, models } from 'mongoose'

import { AuthMethod, AuthSchemaCode, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthSteps, UserAuthStepsStatus, UserAuthStepsStatusHistoryItem } from '@interfaces/models/userAuthSteps'

const statusHistoryItemSchema = new Schema<UserAuthStepsStatusHistoryItem>(
    {
        status: { type: String, enum: Object.values(UserAuthStepsStatus), required: true },
        date: { type: Date, required: true },
    },
    {
        _id: false,
    },
)

const stepSchema = new Schema<UserAuthStep>(
    {
        method: { type: String, enum: Object.values(AuthMethod), required: true },
        attempts: { type: Number, required: true },
        verifyAttempts: { type: Number, default: 0, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
    },
    {
        _id: false,
    },
)

const userAuthStepsSchema = new Schema<UserAuthSteps>(
    {
        userIdentifier: { type: String, index: true },
        mobileUid: { type: String, index: true, required: true },
        processId: { type: String, unique: true, required: true },
        admittedAfterProcess: { type: String },
        code: { type: String, enum: Object.values(AuthSchemaCode), required: true },
        status: { type: String, enum: Object.values(UserAuthStepsStatus), required: true },
        statusHistory: { type: [statusHistoryItemSchema], required: true },
        conditions: { type: [String], enum: Object.values(AuthSchemaCondition), required: true },
        steps: { type: [stepSchema] },
        phoneNumber: { type: String },
        isRevoked: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
)

export default <Model<UserAuthSteps>>models.UserAuthSteps || model('UserAuthSteps', userAuthStepsSchema)
