import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import BankService from '@services/bank'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getBanks'
import { BankResponse } from '@interfaces/services/bank'

export default class GetBanksAction implements AppAction {
    constructor(private readonly bankService: BankService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getBanks'

    async handler(params: CustomActionArguments): Promise<ActionResult> {
        const { headers } = params
        const banks: BankResponse[] = await this.bankService.getBanks(headers)

        return { banks }
    }
}
