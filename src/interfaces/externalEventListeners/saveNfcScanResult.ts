import { ExternalResponseBaseEventPayload } from '@interfaces/externalEventListeners/index'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'

export interface EventPayload extends ExternalResponseBaseEventPayload {
    request?: {
        mobileUid: string
        scanResult: NfcUserDTO
    }
}
