import TestKit from '@diia-inhouse/test'

import DocumentsService from '@services/documents'

import { AuthMockProvider } from '@tests/interfaces/mocks/services/authMethods'

export default class EResidentMrzMock implements AuthMockProvider {
    private testKit: TestKit

    constructor(private readonly documentsService: DocumentsService) {
        this.testKit = new TestKit()
    }

    async requestAuthorizationUrl(): Promise<void> {
        // no-op
    }

    async getUserData(): Promise<void> {
        const eResidencyData = this.testKit.docs.getEResidency()

        jest.spyOn(this.documentsService, 'getEResidencyToProcess').mockImplementationOnce(async () => eResidencyData)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSpecificParams(): Record<string, any> {
        return {
            mrzPayload: {
                residenceCountry: 'SVK',
                docNumber: '2222-111111',
            },
        }
    }
}
