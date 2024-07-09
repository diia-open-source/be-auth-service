import nock from 'nock'

import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { StoreService } from '@diia-inhouse/redis'
import { HttpStatusCode } from '@diia-inhouse/types'

import { generateItn } from '@mocks/randomData'

import { AuthMockProvider, GetUserDataParams } from '@tests/interfaces/mocks/services/authMethods'

import { AppConfig } from '@interfaces/config'
import { GenderAsSex } from '@interfaces/services/authMethods'
import { BankIdDocumentType, BankIdUser } from '@interfaces/services/authMethods/bankId'

export default class BankIdMock implements AuthMockProvider {
    constructor(
        private readonly config: AppConfig,
        private readonly store: StoreService,
        private readonly external: ExternalCommunicator,
    ) {
        this.host = `https://${this.config.bankId.host}`
    }

    private readonly host

    private readonly bankId: string = 'diiabank'

    async requestAuthorizationUrl(): Promise<void> {
        const mockBank: { workable: boolean } = { workable: true }
        const cacheKey = `bank.${this.bankId}`

        await this.store.set(cacheKey, JSON.stringify(mockBank), { ttl: 1000 })
    }

    async getUserData(params: GetUserDataParams = {}): Promise<void> {
        const { statusCode = HttpStatusCode.OK, itn = generateItn() } = params

        const user: BankIdUser = {
            type: '',
            firstName: 'Надія',
            lastName: 'Дія',
            middleName: 'Володимирівна',
            sex: GenderAsSex.F,
            inn: itn,
            email: 'test@test.com',
            phone: '+380999999999',
            birthDay: '24.08.1991',
            addresses: [],
            documents: [
                {
                    type: BankIdDocumentType.ForeignPassport,
                    typeName: '',
                    series: 'TT',
                    number: '12345',
                    issue: '',
                    dateIssue: '',
                    dateExpiration: '',
                    issueCountryIso2: '',
                },
            ],
        }

        const bankIdNock = nock(this.host).post(this.config.bankId.tokenPath).reply(statusCode, { access_token: 'token' })

        if (statusCode !== HttpStatusCode.OK) {
            return
        }

        bankIdNock.post(this.config.bankId.userPath).reply(HttpStatusCode.OK, {})

        jest.spyOn(this.external, 'receive')
            .mockImplementationOnce(async () => ({ cert: '' }))
            .mockImplementationOnce(async () => ({ data: JSON.stringify(user) }))
    }

    getSpecificParams(): Record<string, string> {
        return { bankId: this.bankId }
    }
}
