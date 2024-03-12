import { Document } from 'mongoose'

import { AuthEntryPoint, SessionType } from '@diia-inhouse/types'

export interface AuthEntryPointHistory {
    authEntryPoint: AuthEntryPoint
    date: Date
}

export interface RefreshToken {
    value: string
    expirationTime: number
    sessionType: SessionType
    eisTraceId: string
    mobileUid?: string
    authEntryPoint?: AuthEntryPoint
    authEntryPointHistory?: AuthEntryPointHistory[]
    expired?: boolean
    isCompromised?: boolean
    entityId?: string
    userIdentifier?: string
    platformType?: string
    platformVersion?: string
    appVersion?: string
    isDeleted?: boolean
    login?: string
    lastActivityDate?: Date
    isLoadTestPeriod?: boolean
    expirationDate?: Date
}

export interface RefreshTokenModel extends RefreshToken, Document {
    createdAt?: Date
    updatedAt?: Date
}
