import { EventBusListener } from '@diia-inhouse/diia-queue'

import BankService from '@services/bank'

import { ScheduledTaskEvent } from '@interfaces/application'

export default class AuthUpdateBankIdBankListCronTask implements EventBusListener {
    constructor(private bankService: BankService) {}

    readonly event: ScheduledTaskEvent = ScheduledTaskEvent.AuthUpdateBankIdBankList

    async handler(): Promise<void> {
        await this.bankService.updateBanksList()
    }
}
