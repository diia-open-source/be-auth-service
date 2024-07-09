import { Document } from '@diia-inhouse/db'

import { IntegrityChallenge } from '@interfaces/models/integrity/integrityChallenge'

export interface AttestationResultData {
    apkCertificateDigestSha256?: string[]
    apkDigestSha256?: string
    apkPackageName?: string
    basicIntegrity?: boolean
    timestampMs?: number
    evaluationType?: string
    error?: Record<string, unknown>
}

export interface Attestation extends IntegrityChallenge {
    ctsProfileMatch?: boolean
    resultData?: AttestationResultData
}

export interface AttestationModel extends Attestation, Document {}
