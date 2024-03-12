import { Document } from 'mongoose'

import { IntegrityChallenge } from '@interfaces/models/integrity/integrityChallenge'

export interface IntegrityResultData {
    requestDetails: {
        requestPackageName: string
        nonce: string
        timestampMillis: number
    }

    appIntegrity: {
        appRecognitionVerdict: string
        packageName?: string
        certificateSha256Digest?: string[]
        versionCode: number
    }

    deviceIntegrity: {
        deviceRecognitionVerdict: string[]
    }

    accountDetails: {
        appLicensingVerdict: string
    }
}

export enum GoogleIntegrityCheckStatus {
    CheckCreated = 'checkCreated',
    CheckLaunched = 'checkLaunched',
    CheckSucceeded = 'checkSucceeded',
    CheckFailed = 'checkFailed',
}

export interface GoogleIntegrityCheck extends IntegrityChallenge {
    integrityResultData?: IntegrityResultData
    checkStatus: GoogleIntegrityCheckStatus
}

export interface GoogleIntegrityCheckModel extends GoogleIntegrityCheck, Document {}
