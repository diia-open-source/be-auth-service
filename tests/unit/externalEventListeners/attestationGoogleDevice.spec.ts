import { randomUUID } from 'node:crypto'

import { mockInstance } from '@diia-inhouse/test'

import AttestationGoogleDeviceEventListener from '@src/externalEventListeners/attestationGoogleDevice'

import AttestationService from '@services/integrity/attestation'

import { EventPayload } from '@interfaces/externalEventListeners/attestationGoogleDevice'

describe(`${AttestationGoogleDeviceEventListener.name}`, () => {
    const integrityAttestationServiceMock = mockInstance(AttestationService)
    const attestationGoogleDeviceEventListener = new AttestationGoogleDeviceEventListener(integrityAttestationServiceMock)

    describe(`method: ${attestationGoogleDeviceEventListener.handler.name}`, () => {
        it('should successfully invoke attestation process', async () => {
            const nonce = randomUUID()
            const message: EventPayload = {
                uuid: randomUUID(),
                response: {
                    ctsProfileMatch: true,
                    nonce,
                },
            }

            jest.spyOn(integrityAttestationServiceMock, 'onSafetyNetAttestationComplete').mockResolvedValueOnce()

            expect(await attestationGoogleDeviceEventListener.handler(message)).toBeUndefined()
            expect(integrityAttestationServiceMock.onSafetyNetAttestationComplete).toHaveBeenCalledWith(nonce, true, {}, undefined)
        })
    })
})
