import nock from 'nock'

import { HttpStatusCode } from '@diia-inhouse/types'

import PrivatBankAuthMethodService from '@services/authMethods/privatBank'

import { generateItn } from '@mocks/randomData'

import { AuthMockProvider, GetUserDataParams } from '@tests/interfaces/mocks/services/authMethods'

import { GenderAsSex } from '@interfaces/services/authMethods'
import { PrivatBankUserDTO } from '@interfaces/services/authMethods/privatBank'

export default class PrivatBankMock implements AuthMockProvider {
    constructor(private readonly authMethodsPrivatBankService: PrivatBankAuthMethodService) {
        this.host = `https://${this.authMethodsPrivatBankService.serviceConfig.baseUrl}`
    }

    private readonly host

    async requestAuthorizationUrl(): Promise<void> {
        nock(this.host).post(/.*/).reply(HttpStatusCode.OK, { sid: 'privatbank-sid' })
    }

    async getUserData(params: GetUserDataParams = {}): Promise<void> {
        const { statusCode = HttpStatusCode.OK, itn = generateItn() } = params

        const userData: PrivatBankUserDTO = {
            fio: 'Дія Надія Володимирівна',
            name: 'Надія',
            surname: 'Дія',
            patronymic: 'Володимирівна',
            sex: GenderAsSex.F,
            inn: itn,
            passport: 'TT12345',
            email: 'test@test.com',
            phone: '+380999999999',
            address: '',
            birthplace: '',
            birthday: '24.08.1991',
        }

        nock(this.host).post(/.*/).reply(statusCode, { userData })
    }

    getSpecificParams(): Record<string, string> {
        return {}
    }
}
