import UserService from '@services/user'

import FaceRecoAuthPhotoVerificationMockEventListener from '@mocks/externalEventListeners/faceRecoAuthPhotoVerification'

import { AuthMockProvider, GetUserDataParams } from '@tests/interfaces/mocks/services/authMethods'

import { DocumentType } from '@interfaces/services/documents'

export default class PhotoIdMock implements AuthMockProvider {
    constructor(
        private readonly userService: UserService,
        private readonly faceRecoAuthPhotoVerificationMockEventListener: FaceRecoAuthPhotoVerificationMockEventListener,
    ) {}

    async requestAuthorizationUrl(): Promise<void> {
        jest.spyOn(this.userService, 'getFeaturePoints').mockImplementationOnce(async () => ({
            points: [{ documentType: DocumentType.InternalPassport, documentIdentifier: 'identifier', points: [] }],
        }))
    }

    async getUserData(params: GetUserDataParams = {}): Promise<void> {
        const { requestId } = params

        if (!requestId) {
            throw new Error('requestId is required')
        }

        await this.faceRecoAuthPhotoVerificationMockEventListener.handle(requestId)
    }

    getSpecificParams(): Record<string, string> {
        return {}
    }
}
