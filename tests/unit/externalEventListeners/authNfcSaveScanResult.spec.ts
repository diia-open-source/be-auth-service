import { randomUUID } from 'crypto'

import { BadRequestError } from '@diia-inhouse/errors'
import { mockInstance } from '@diia-inhouse/test'

import SaveNfcScanResultEventListener from '@src/externalEventListeners/authNfcSaveScanResult'

import NfcService from '@services/nfc'

import { EventPayload } from '@interfaces/externalEventListeners/saveNfcScanResult'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'

describe(`${SaveNfcScanResultEventListener.name}`, () => {
    const nfcServiceMock = mockInstance(NfcService)
    const saveNfcScanResultEventListener = new SaveNfcScanResultEventListener(nfcServiceMock)

    describe(`method: ${saveNfcScanResultEventListener.handler.name}`, () => {
        it('should successfully invoke saving process for nfc scan result', async () => {
            const mobileUid = randomUUID()
            const message: EventPayload = {
                uuid: randomUUID(),
                request: {
                    mobileUid,
                    scanResult: <NfcUserDTO>{},
                },
            }

            jest.spyOn(nfcServiceMock, 'saveNfcScanResult').mockResolvedValueOnce(mobileUid)

            expect(await saveNfcScanResultEventListener.handler(message)).toEqual(mobileUid)
            expect(nfcServiceMock.saveNfcScanResult).toHaveBeenCalledWith(mobileUid, message.request?.scanResult)
        })

        it.each([
            [
                'error is present in event payload',
                <EventPayload>{ uuid: randomUUID(), error: { http_code: 400, message: 'invalid input' } },
            ],
            ['request is not present in event payload', <EventPayload>{ uuid: randomUUID(), request: undefined }],
        ])('should throw bad request error in case %s', async (_msg: string, message: EventPayload) => {
            await expect(async () => {
                await saveNfcScanResultEventListener.handler(message)
            }).rejects.toEqual(new BadRequestError('Error on saveScanResult', { error: message.error }))
        })
    })
})
