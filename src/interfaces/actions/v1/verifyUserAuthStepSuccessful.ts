import { UserActionArguments } from '@diia-inhouse/types'

import { SchemaCode } from '@interfaces/services/userAuthSteps'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        schemaCode: SchemaCode
        processId: string
    }
}

export type ActionResult = void
