import { UserActionArguments } from '@diia-inhouse/types'

export interface CustomActionArguments extends UserActionArguments {
    params: {
        schemaCode: string
        processId: string
    }
}

export type ActionResult = void
