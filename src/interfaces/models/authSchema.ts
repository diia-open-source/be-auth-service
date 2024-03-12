import { Document } from 'mongoose'

import { PlatformType } from '@diia-inhouse/types'

import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'

export enum AuthSchemaCode {
    Authorization = 'authorization',
    CabinetAuthorization = 'cabinet-authorization',
    DiiaIdCreation = 'diia-id-creation',
    DiiaIdSigning = 'diia-id-signing',
    DiiaIdSharingDeeplinkDynamic = 'diia-id-sharing-deeplink-dynamic',
    DiiaIdSharingDeeplinkStatic = 'diia-id-sharing-deeplink-static',
    DiiaIdSharingBarcode = 'diia-id-sharing-barcode',
    Prolong = 'prolong',
    ResidencePermitNfcAdding = 'residence-permit-nfc-adding',
    MilitaryBondsSigning = 'military-bonds-signing',
    MortgageSigning = 'mortgage-signing',

    EResidentFirstAuth = 'e-resident-first-auth',
    EResidentAuth = 'e-resident-auth',
    EResidentApplicantAuth = 'e-resident-applicant-auth',
    EResidentDiiaIdCreation = 'e-resident-diia-id-creation',
    EResidentDiiaIdSigning = 'e-resident-diia-id-signing',
}

export enum AuthMethod {
    PhotoId = 'photoid',
    Nfc = 'nfc',
    BankId = 'bankid',
    Monobank = 'monobank',
    PrivatBank = 'privatbank',
    EResidentQrCode = 'e-resident-qr-code',
    EResidentMrz = 'e-resident-mrz',
    EResidentNfc = 'e-resident-nfc',
    EmailOtp = 'email-otp',
    Qes = 'qes',
    Ds = 'ds',
}

export enum AuthSchemaCondition {
    HasDocumentPhoto = 'hasDocumentPhoto',
}

export enum FldConfigVersion {
    'v1.0' = '1.0',
    'v1.1' = '1.1',
}

export interface FldAndroidConfigV1 {
    solutionsSize: number
    deviationThreshold: number
    confidenceThreshold: number
    failureCooldown: number
    sensorRotationYLow: number
    sensorRotationYUp: number
    sensorAccelerometerYLow: number
    sensorAccelerometerYUp: number
    sensorAccelerometerXLow: number
    sensorAccelerometerXUp: number
    headEulerAngleXLow: number
    headEulerAngleXUp: number
    headEulerAngleYLow: number
    headEulerAngleYUp: number
    headEulerAngleZLow: number
    headEulerAngleZUp: number
    faceBoundingEdgeMin: number
    faceBoundingEdgeMax: number
    faceMinSize: number
    faceBoundingBoxThreshold: number
    faceDarkPixelUp: number
    faceLightPixelLow: number
    brightThreshold: number
    darkThreshold: number
    eyeClosedUpperProbability: number
    smileLowerProbability: number
    solutionTtl: number
    allowedCameraResolutions: string
    frameProcessingExecutors: number
    frameProcessingPoolSize: number
}

export interface FldAndroidConfig extends FldAndroidConfigV1 {
    messages: Record<string, string>
}

export interface FldIosConfig {
    minEyesToNoseCheck: number
    maxEyesToNoseCheck: number
    minLipsToNoseCheck: number
    maxLipsToNoseCheck: number
    minBrownToEyesCheck: number
    maxBrownToEyesCheck: number
    minBrightness: number
    maxBrightness: number
    yawThreshold: number
    minRollThreshold: number
    maxRollThreshold: number
    faceBoundsMinX: number
    faceBoundsMaxX: number
    faceBoundsMinMaxY: number
    faceBoundsMaxMaxY: number
    faceBoundsMinMinY: number
    faceBoundsMaxMinY: number
    faceBoundsHeight: number
    blurVarienceThreshold: number
    messages: Record<string, string>
}

export type FldConfigValues = FldAndroidConfig | FldAndroidConfigV1 | FldIosConfig

export interface FldConfig {
    version: FldConfigVersion
    values: FldConfigValues
    maxAppVersion?: string
}

export interface AuthSchemaMethod extends Partial<Record<AuthMethod, AuthSchemaMethod>> {
    maxAttempts: number
    maxVerifyAttempts: number
    ttl: number
    methods?: AuthMethod[]
    condition?: AuthSchemaCondition
}

export interface AdmissionSchema {
    code: AuthSchemaCode
    admitAfterStatus?: UserAuthStepsStatus
}

export interface AuthSchema extends Partial<Record<AuthMethod, AuthSchemaMethod>> {
    code: AuthSchemaCode
    title?: string
    description?: string
    methods: AuthMethod[]
    checks?: ProcessCode[]
    admitAfter?: AdmissionSchema[]
    faceLivenessDetectionConfig?: Record<PlatformType, FldConfig[]>
}

export interface AuthSchemaModel extends AuthSchema, Document {}
