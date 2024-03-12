import BankDataMapper from '@dataMappers/bankDataMapper'

import { AppConfig } from '@interfaces/config'
import { Bank, BankIdResponse } from '@interfaces/services/bank'

describe('BankDataMapper', () => {
    const bankId: { host: string } = {
        host: 'mock-bank-host',
    }

    const mapper = new BankDataMapper(<AppConfig>{ bankId })

    describe('method: `toEntity`', () => {
        test('should convert Bank object to BankResponse interface', () => {
            const mockBank: Bank = {
                bankId: 'bank123',
                name: 'Mock Bank',
                logoUrl: 'mock-logo.png',
                workable: true,
                sortOrder: 1,
                memberId: 'member456',
            }

            const result = mapper.toEntity(mockBank)

            expect(result).toEqual({
                id: 'bank123',
                name: 'Mock Bank',
                logoUrl: 'mock-logo.png',
                workable: true,
            })
        })
    })

    describe('method: `mapBankIdResponseItem`', () => {
        test('should convert BankIdResponse to Bank interface', () => {
            const mockBankIdResponse: BankIdResponse = {
                id: 'bank123',
                name: 'Mock Bank',
                workable: true,
                memberId: 'member456',
                logoUrl: 'mock-logo.png',
                loginUrl: 'https://mock-bank.com/login',
                order: 1,
            }

            const result = mapper.mapBankIdResponseItem(mockBankIdResponse)

            expect(result).toEqual({
                bankId: 'bank123',
                name: 'Mock Bank',
                memberId: 'member456',
                logoUrl: `https://${bankId.host}/mock-logo.png`,
                workable: true,
                sortOrder: 1,
            })
        })
    })
})
