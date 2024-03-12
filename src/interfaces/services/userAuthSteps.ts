import { AppUserActionHeaders, PublicServiceKebabCaseCode, UserTokenData } from '@diia-inhouse/types'

import { AuthMethod, AuthSchema, AuthSchemaCode, AuthSchemaCondition, AuthSchemaMethod } from '@interfaces/models/authSchema'
import { UserAuthStepsModel, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthMethodVerifyParams } from '@interfaces/services/auth'
import { GetTokenParams } from '@interfaces/services/userAuthToken'

export enum ButtonAction {
    Close = 'close',
}

export type AuthStepHeaders = AppUserActionHeaders

export interface AuthMethodsResponse {
    processId: string
    title?: string
    description?: string
    authMethods?: AuthMethod[]
    button?: {
        action: ButtonAction
    }
    skipAuthMethods: boolean
    processCode?: ProcessCode
}

export interface AuthStrategyVerifyOptions {
    method: AuthMethod
    requestId: string
    authSteps: UserAuthStepsModel
    headers: AuthStepHeaders
    authMethodParams: AuthMethodVerifyParams
    user?: UserTokenData
}

export interface AuthSchemaStrategy {
    isUserRequired: boolean
    completeOnSuccess?: boolean
    verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]>
    onAttemptsExceeded?(user: UserTokenData, headers: AuthStepHeaders): Promise<void>
    authSchemaEndedChainProcessCode?: ProcessCode
    authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode
}

export interface ExtractAuthMethodsResult {
    methods: AuthMethod[]
    processCode?: ProcessCode
}

export interface QrCodePayload {
    token: string
}

export interface MrzPayload {
    docNumber: string
    residenceCountry: string
}

export interface GetEResidencyToProcessQrCodeParams {
    qrCodeToken: string
}

export interface GetEResidencyToProcessMrzParams {
    docNumber: string
    issuingCountry: string
}

export interface GetEResidencyToProcessByItnParams {
    itn: string
}

export type GetEResidencyToProcessParams = { handlePhoto?: boolean } & (
    | GetEResidencyToProcessQrCodeParams
    | GetEResidencyToProcessMrzParams
    | GetEResidencyToProcessByItnParams
)

export interface AuthStepsSearchParams {
    code?: SchemaCode
    oneOfCodes?: AuthSchemaCode[]
    processId: string
    mobileUid: string
    userIdentifier?: string
}

export interface QesPayload {
    signature: string
}

export interface RevokeSubmitAfterUserAuthStepsRequest {
    code: AuthSchemaCode
    mobileUid: string
    userIdentifier: string
}

export interface RevokeSubmitAfterUserAuthStepsResult {
    success: boolean
    revokedActions: number
}

export type SchemaCode = AuthSchemaCode | PublicServiceKebabCaseCode

export interface AuthorizationDataParams<T = GetTokenParams> {
    tokenParams: T
    code: AuthSchemaCode
    processId: string
    userIdentifier: string
    attachUserIdentifier: boolean
}

export interface UserAuthStepsValidationParams {
    methodToValidate: AuthMethod
    processId: string
    shouldCheckVerifyAttempts: boolean
    shouldFailPrevSteps: boolean
    throwOnLastAttempt: boolean
    headers: AppUserActionHeaders
    strategy: AuthSchemaStrategy
    authSchemaMethod?: AuthSchemaMethod | AuthSchema
    user?: UserTokenData
}

export type AuthStepsStatusToAuthMethodProcessCode = Partial<Record<UserAuthStepsStatus, Partial<Record<AuthMethod, ProcessCode>>>>
