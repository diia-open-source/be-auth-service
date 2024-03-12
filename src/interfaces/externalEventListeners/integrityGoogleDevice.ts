import { ActHeaders } from '@diia-inhouse/types'

import { ExternalResponseBaseEventPayload } from '@interfaces/externalEventListeners'
import { IntegrityResultData } from '@interfaces/models/integrity/googleIntegrityCheck'

export interface EventPayload extends ExternalResponseBaseEventPayload {
    response?: {
        userIdentifier: string
        headers: ActHeaders
        integrityResultData: IntegrityResultData
    }
}
