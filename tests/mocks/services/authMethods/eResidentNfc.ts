import TestKit from '@diia-inhouse/test'

import DocumentsService from '@services/documents'
import NfcService from '@services/nfc'
import RefreshTokenService from '@services/refreshToken'

import { AuthMockProvider } from '@tests/interfaces/mocks/services/authMethods'

import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'

export default class EResidentNfcMock implements AuthMockProvider {
    private testKit: TestKit

    constructor(
        private readonly documentsService: DocumentsService,
        private readonly nfcService: NfcService,
        private readonly refreshTokenService: RefreshTokenService,
    ) {
        this.testKit = new TestKit()
    }

    async requestAuthorizationUrl(): Promise<void> {
        // no-op
    }

    async getUserData(): Promise<void> {
        const eResidencyData = this.testKit.docs.getEResidency()

        jest.spyOn(this.documentsService, 'getEResidencyToProcess').mockImplementationOnce(async () => eResidencyData)
        jest.spyOn(this.nfcService, 'isUserPhotoVerified').mockImplementationOnce(async () => true)
        jest.spyOn(this.nfcService, 'getUserDataFromCache').mockImplementationOnce(
            async () =>
                <NfcUserDTO>{
                    issuingState: 'SVK',
                    docNumber: '2222-111111',
                },
        )
        jest.spyOn(this.refreshTokenService, 'isTemporaryTokenInvalidate').mockImplementationOnce(async () => true)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSpecificParams(): Record<string, any> {
        return {}
    }
}
