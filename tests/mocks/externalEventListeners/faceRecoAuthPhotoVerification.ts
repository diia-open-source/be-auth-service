import { v4 as uuid } from 'uuid'

import FaceRecoAuthPhotoVerificationEventListener from '@src/externalEventListeners/faceRecoAuthPhotoVerification'

import { EventPayload } from '@interfaces/externalEventListeners/faceRecoAuthPhotoVerification'
import { DocumentType } from '@interfaces/services/documents'

export default class FaceRecoAuthPhotoVerificationEventMock {
    constructor(private readonly faceRecoAuthPhotoVerificationExternalEventListener: FaceRecoAuthPhotoVerificationEventListener) {}

    async handle(requestId: string): Promise<EventPayload> {
        const payload: EventPayload = {
            uuid: uuid(),
            response: {
                requestId,
                documents: [
                    {
                        documentIdentifier: 'identifier',
                        documentType: DocumentType.InternalPassport,
                        matched: true,
                    },
                ],
            },
        }

        await this.faceRecoAuthPhotoVerificationExternalEventListener.handler(payload)

        return payload
    }
}
