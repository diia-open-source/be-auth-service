import * as Endpoint from 'monobank-api-client/src/Endpoint'
import nock from 'nock'

import { HttpStatusCode } from '@diia-inhouse/types'

import MonobankAuthMethodService from '@services/authMethods/monobank'

import { generateItn } from '@mocks/randomData'

import { AuthMockProvider, GetUserDataParams } from '@tests/interfaces/mocks/services/authMethods'

import { GenderAsPerson } from '@interfaces/services/authMethods'
import { MonobankUserDTO } from '@interfaces/services/authMethods/monobank'

export default class MonobankMock implements AuthMockProvider {
    constructor(private readonly authMethodsMonobankService: MonobankAuthMethodService) {}

    private readonly host: string = `https://${this.authMethodsMonobankService.serviceConfig.baseUrl}`

    async requestAuthorizationUrl(): Promise<void> {
        nock(this.host).post(Endpoint.PERSONAL_AUTH_REQUEST).reply(HttpStatusCode.OK, { acceptUrl: 'monobank-url' })
    }

    async getUserData(params: GetUserDataParams = {}): Promise<void> {
        const { statusCode = HttpStatusCode.OK, itn = generateItn() } = params

        const user: MonobankUserDTO = {
            fName: 'Дія',
            lName: 'Надія',
            mName: 'Володимирівна',
            inn: itn,
            passportSeries: 'TT',
            passportNumber: '12345',
            email: 'test@test.com',
            phoneNumber: '+380999999999',
            addressOfRegistration: '',
            addressOfBirth: '',
            birthDay: '24.08.1991',
            gender: GenderAsPerson.Woman,
            clientId: '123456',
        }

        nock(this.host).get(Endpoint.CLIENT_INFO).reply(statusCode, user)
    }

    getSpecificParams(): Record<string, string> {
        return {}
    }
}
