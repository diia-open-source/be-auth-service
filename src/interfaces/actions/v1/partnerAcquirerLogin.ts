import { ActionContext, PartnerSession } from '@diia-inhouse/types'

interface ActionParams {
    acquirerId: string
}

interface ActionHeaders {
    traceId: string
}

export type Context = ActionContext<ActionParams, PartnerSession<string>, ActionHeaders>

export interface ActionResult {
    token: string
}
