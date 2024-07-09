import { Model, Schema, model, models } from '@diia-inhouse/db'
import { PlatformType } from '@diia-inhouse/types'

import {
    AdmissionSchema,
    AuthMethod,
    AuthSchema,
    AuthSchemaCode,
    AuthSchemaCondition,
    AuthSchemaMethod,
    FldConfig,
    FldConfigVersion,
} from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'

const authSchemaMethodSchema = new Schema<AuthSchemaMethod>(
    {
        maxAttempts: { type: Number, required: true },
        maxVerifyAttempts: { type: Number, default: 1, required: true },
        ttl: { type: Number, required: true },
        methods: { type: [String], enum: Object.values(AuthMethod) },
        condition: { type: String, enum: Object.values(AuthSchemaCondition) },
    },
    {
        _id: false,
    },
)

const faceLivenessDetectionConfigSchema = new Schema<FldConfig>(
    {
        version: { type: String, enum: Object.values(FldConfigVersion), required: true },
        values: { type: {}, required: true },
        maxAppVersion: { type: String },
    },
    {
        _id: false,
    },
)

const faceLivenessDetectionConfigByPlatformSchema = new Schema<Record<PlatformType, FldConfig[]>>(
    {
        [PlatformType.Android]: { type: [faceLivenessDetectionConfigSchema], required: true },
        [PlatformType.Huawei]: { type: [faceLivenessDetectionConfigSchema], required: true },
        [PlatformType.iOS]: { type: [faceLivenessDetectionConfigSchema], required: true },
    },
    {
        _id: false,
    },
)

const admissionSchema = new Schema<AdmissionSchema>(
    {
        code: { type: String, enum: Object.values(AuthSchemaCode), required: true },
        admitAfterStatus: { type: String, enum: Object.values(UserAuthStepsStatus) },
    },
    {
        _id: false,
    },
)

const authSchemaSchema = new Schema<AuthSchema>(
    {
        code: { type: String, enum: Object.values(AuthSchemaCode), unique: true, required: true },
        title: { type: String, required: true },
        description: { type: String },
        methods: { type: [String], enum: Object.values(AuthMethod), required: true },
        checks: { type: [Number], enum: Object.values(ProcessCode) },
        admitAfter: { type: [admissionSchema] },
        faceLivenessDetectionConfig: { type: faceLivenessDetectionConfigByPlatformSchema },
        ...Object.fromEntries(Object.values(AuthMethod).map((authMethod: AuthMethod) => [authMethod, { type: authSchemaMethodSchema }])),
    },
    { timestamps: true },
)

export default <Model<AuthSchema>>models.AuthSchema || model('AuthSchema', authSchemaSchema)
