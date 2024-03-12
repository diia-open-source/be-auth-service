import { AppUserActionHeaders, ServiceActionArguments } from '@diia-inhouse/types'

import { BankResponse } from '@interfaces/services/bank'

export type CustomActionArguments = ServiceActionArguments<AppUserActionHeaders>

export interface ActionResult {
    banks: BankResponse[]
}
