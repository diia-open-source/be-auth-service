import { v4 as uuid } from 'uuid'

import { DocumentType } from '@diia-inhouse/types'

import FaceRecoAuthPhotoVerificationEventListener from '@src/externalEventListeners/faceRecoAuthPhotoVerification'

import { EventPayload } from '@interfaces/externalEventListeners/faceRecoAuthPhotoVerification'

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
