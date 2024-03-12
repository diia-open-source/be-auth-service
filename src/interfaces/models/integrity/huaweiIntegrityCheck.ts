import { Document } from 'mongoose'

import { IntegrityChallenge } from '@interfaces/models/integrity/integrityChallenge'

export interface HuaweiIntegrityResultData {
    advice?: string
    apkCertificateDigestSha256: string[]
    apkDigestSha256: string
    apkPackageName: string
    appId: string
    basicIntegrity: boolean
    detail?: string[]
    nonce: string
    timestampMs: number
}

export enum HuaweiIntegrityCheckStatus {
    CheckCreated = 'checkCreated',
    CheckLaunched = 'checkLaunched',
    CheckSucceeded = 'checkSucceeded',
    CheckFailed = 'checkFailed',
}

export interface HuaweiIntegrityCheck extends IntegrityChallenge {
    integrityResultData?: HuaweiIntegrityResultData
    checkStatus: HuaweiIntegrityCheckStatus
}

export interface HuaweiIntegrityCheckModel extends HuaweiIntegrityCheck, Document {}
