import { ExternalResponseBaseEventPayload } from '@interfaces/externalEventListeners'

export interface EventPayload extends ExternalResponseBaseEventPayload {
    response?: {
        nonce: string
        ctsProfileMatch: boolean
        apkCertificateDigestSha256?: string[]
        apkDigestSha256?: string
        apkPackageName?: string
        basicIntegrity?: boolean
        timestampMs?: number
        evaluationType?: string
    }
}
