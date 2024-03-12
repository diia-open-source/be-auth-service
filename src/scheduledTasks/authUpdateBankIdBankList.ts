import { EventBusListener, ScheduledTaskEvent } from '@diia-inhouse/diia-queue'

import BankService from '@services/bank'

export default class AuthUpdateBankIdBankListCronTask implements EventBusListener {
    constructor(private bankService: BankService) {}

    readonly event: ScheduledTaskEvent = ScheduledTaskEvent.AuthUpdateBankIdBankList

    async handler(): Promise<void> {
        await this.bankService.updateBanksList()
    }
}
