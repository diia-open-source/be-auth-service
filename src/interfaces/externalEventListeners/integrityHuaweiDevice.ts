import { ActHeaders } from '@diia-inhouse/types'

import { ExternalResponseBaseEventPayload } from '@interfaces/externalEventListeners/index'
import { HuaweiIntegrityResultData } from '@interfaces/models/integrity/huaweiIntegrityCheck'

export interface EventPayload extends ExternalResponseBaseEventPayload {
    response?: {
        userIdentifier: string
        headers: ActHeaders
        integrityResultData: HuaweiIntegrityResultData
    }
}
