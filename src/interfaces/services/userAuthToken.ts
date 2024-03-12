import {
    AppUser,
    AppUserActionHeaders,
    AppUserSessionType,
    EResidentApplicant,
    EResidentApplicantTokenData,
    SessionType,
    User,
} from '@diia-inhouse/types'

import { MrzPayload, QesPayload, QrCodePayload } from './userAuthSteps'

import { AuthMethod } from '@interfaces/models/authSchema'

export interface GenerateTokenResult {
    token: string
    identifier: string
    tokenData: AuthUser
}

export interface ExtractBirthdayResult {
    birthDay: string
    validBirthday?: string
    invalidBirthday?: string
}

export type UserAuthTokenHeadersParams = AppUserActionHeaders

export interface GetUserTokenParams {
    method: AuthMethod
    requestId: string
    headers: UserAuthTokenHeadersParams
    sessionType: AppUserSessionType
    bankId?: string
    user?: User
}

export interface PrepareUserDataParams {
    method: AuthMethod
    requestId: string
    headers: UserAuthTokenHeadersParams
    bankId?: string
    qrCodePayload?: QrCodePayload
    mrzPayload?: MrzPayload
    qesPayload?: QesPayload
    otp?: string
}

export interface GetTokenParams<T = User> {
    method: AuthMethod
    requestId: string
    headers: AppUserActionHeaders
    sessionType: AuthUserSessionType
    bankId?: string
    user?: T
}

export interface ValidateParams {
    method: AuthMethod
    requestId: string
    mobileUid: string
    bankId?: string
}

export interface GetEResidentApplicantTokenParams {
    method: AuthMethod
    requestId: string
    headers: AppUserActionHeaders
    sessionType: SessionType.EResidentApplicant
    user: EResidentApplicant
}

export interface GetEResidentApplicantTokenResult {
    token: string
    identifier: string
}

export type AuthUser = AppUser | EResidentApplicantTokenData

export type AuthUserSessionType = AppUserSessionType | SessionType.EResidentApplicant

export type GetTokenHandlers = Record<AuthUserSessionType, (params: GetTokenParams) => Promise<GenerateTokenResult>>
