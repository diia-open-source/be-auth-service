import { Document } from '@diia-inhouse/db'

import { AuthMethod, AuthSchemaCode, AuthSchemaCondition } from '@interfaces/models/authSchema'

export enum UserAuthStepsStatus {
    Processing = 'processing',
    Failure = 'failure',
    Success = 'success',
    Completed = 'completed',
}

export interface UserAuthStepsStatusHistoryItem {
    status: UserAuthStepsStatus
    date: Date
}

export interface UserAuthStep {
    method: AuthMethod
    attempts: number
    verifyAttempts: number
    startDate: Date
    endDate?: Date
}

export interface UserAuthSteps {
    code: AuthSchemaCode
    mobileUid: string
    userIdentifier?: string
    processId: string
    admittedAfterProcess?: string
    status: UserAuthStepsStatus
    statusHistory: UserAuthStepsStatusHistoryItem[]
    steps?: UserAuthStep[]
    conditions: AuthSchemaCondition[]
    phoneNumber?: string
    isRevoked: boolean
}

export interface UserAuthStepsModel extends UserAuthSteps, Document {}
