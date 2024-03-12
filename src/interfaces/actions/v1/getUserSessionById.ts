import { UserActionArguments } from '@diia-inhouse/types'

import { SessionWithActions } from '@interfaces/services/session'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        id: string
    }
}

export type ActionResult = SessionWithActions
