import { ExternalResponseBaseEventPayload } from '@interfaces/externalEventListeners'

export enum ResponseCode {
    Success = 1,
}

export interface EventPayload extends ExternalResponseBaseEventPayload {
    response?: {
        success: number
        message: string
    }
}
