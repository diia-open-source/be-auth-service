import { UserActionHeaders } from '@diia-inhouse/types'

export enum DiiaIdAction {
    Creation = 'creation',
    Signing = 'signing',
    CreationAndSigning = 'creationAndSigning',
}

export type DiiaIdHeaders = UserActionHeaders
