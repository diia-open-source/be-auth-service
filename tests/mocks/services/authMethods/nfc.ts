import { DocumentTypeCamelCase } from '@diia-inhouse/types'

import InvalidateTemporaryTokenAction from '@actions/v1/invalidateTemporaryToken'

import NfcService from '@services/nfc'

import { generateItn } from '@mocks/randomData'

import { AuthMockProvider, GetUserDataParams } from '@tests/interfaces/mocks/services/authMethods'

import { GenderAsSex } from '@interfaces/services/authMethods'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'

export default class NfcMock implements AuthMockProvider {
    constructor(
        private readonly nfcService: NfcService,
        private readonly invalidateTemporaryTokenAction: InvalidateTemporaryTokenAction,
    ) {}

    async requestAuthorizationUrl(): Promise<void> {
        // no-op
    }

    async getUserData(params: GetUserDataParams = {}): Promise<void> {
        const { itn = generateItn(), headers, nfc } = params

        if (!nfc) {
            throw new Error('Nfc param is required')
        }

        if (!headers) {
            throw new Error('Headers is required')
        }

        const { token, photoVerificationResult = true } = nfc

        const user: NfcUserDTO = {
            docType: DocumentTypeCamelCase.foreignPassport,
            docSerie: 'TT',
            docNumber: '12345',
            firstName: 'Надія',
            lastName: 'Дія',
            middleName: 'Володимирівна',
            itn,
            recordNumber: '',
            birthDay: '24.08.1991',
            gender: GenderAsSex.F,
        }

        await this.invalidateTemporaryTokenAction.handler({ params: { ticket: token }, headers })
        await Promise.all([
            this.nfcService.saveUserData(headers.mobileUid, user),
            this.nfcService.saveUserPhotoVerificationResult(headers.mobileUid, photoVerificationResult),
        ])
    }

    getSpecificParams(): Record<string, string> {
        return {}
    }
}
