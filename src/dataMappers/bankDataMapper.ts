import { AppConfig } from '@interfaces/config'
import { Bank, BankIdResponse, BankResponse } from '@interfaces/services/bank'

export default class BankDataMapper {
    constructor(private readonly config: AppConfig) {}

    toEntity(bank: Bank): BankResponse {
        const { bankId, name, logoUrl, workable } = bank

        return {
            id: bankId,
            name,
            logoUrl,
            workable,
        }
    }

    mapBankIdResponseItem(item: BankIdResponse): Bank {
        const { id, name, workable, logoUrl, order, memberId } = item

        return {
            bankId: id,
            name,
            memberId,
            logoUrl: `https://${this.config.bankId.host}/${logoUrl}`,
            workable,
            sortOrder: order,
        }
    }
}
