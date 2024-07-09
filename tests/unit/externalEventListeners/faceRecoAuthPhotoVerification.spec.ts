import { randomUUID } from 'node:crypto'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { BadRequestError } from '@diia-inhouse/errors'
import { mockInstance } from '@diia-inhouse/test'

import FaceRecoAuthPhotoVerificationEventListener from '@src/externalEventListeners/faceRecoAuthPhotoVerification'

import NfcService from '@services/nfc'
import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'
import RefreshTokenService from '@services/refreshToken'

import { EventPayload } from '@interfaces/externalEventListeners/faceRecoAuthPhotoVerification'

describe(`${FaceRecoAuthPhotoVerificationEventListener.name}`, () => {
    const loggerMock = mockInstance(DiiaLogger)
    const nfcServiceMock = mockInstance(NfcService)
    const photoIdAuthRequestServiceMock = mockInstance(PhotoIdAuthRequestService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const faceRecoAuthPhotoVerificationEventListener = new FaceRecoAuthPhotoVerificationEventListener(
        loggerMock,
        nfcServiceMock,
        photoIdAuthRequestServiceMock,
        refreshTokenServiceMock,
    )

    describe(`method: ${faceRecoAuthPhotoVerificationEventListener.handler.name}`, () => {
        describe('when it is nfc flow', () => {
            it('should successfully save verification result', async () => {
                const message: EventPayload = {
                    uuid: randomUUID(),
                    response: {
                        requestId: randomUUID(),
                        documents: [{ documentIdentifier: 'doc-identifier', documentType: 'doc-type', matched: true }],
                    },
                }

                jest.spyOn(nfcServiceMock, 'nfcUserDataExists').mockResolvedValueOnce(true)
                jest.spyOn(refreshTokenServiceMock, 'isExists').mockResolvedValueOnce(true)
                jest.spyOn(nfcServiceMock, 'saveUserPhotoVerificationResult').mockResolvedValueOnce()

                expect(await faceRecoAuthPhotoVerificationEventListener.handler(message)).toBeUndefined()
                expect(nfcServiceMock.nfcUserDataExists).toHaveBeenCalledWith(message.response?.requestId)
                expect(refreshTokenServiceMock.isExists).toHaveBeenCalledWith(message.uuid, message.response?.requestId)
                expect(nfcServiceMock.saveUserPhotoVerificationResult).toHaveBeenCalledWith(
                    message.response?.requestId,
                    message.response?.documents[0].matched,
                )
                expect(loggerMock.info).toHaveBeenCalledWith('Successfully saved verification result', {
                    requestId: message.response?.requestId,
                    docMatch: true,
                })
            })

            it('should just log error and do nothing in case is not able to find refresh token by traceId', async () => {
                const message: EventPayload = {
                    uuid: randomUUID(),
                    response: {
                        requestId: randomUUID(),
                        documents: [],
                    },
                }

                jest.spyOn(nfcServiceMock, 'nfcUserDataExists').mockResolvedValueOnce(true)
                jest.spyOn(refreshTokenServiceMock, 'isExists').mockResolvedValueOnce(false)

                expect(await faceRecoAuthPhotoVerificationEventListener.handler(message)).toBeUndefined()
                expect(nfcServiceMock.nfcUserDataExists).toHaveBeenCalledWith(message.response?.requestId)
                expect(refreshTokenServiceMock.isExists).toHaveBeenCalledWith(message.uuid, message.response?.requestId)
                expect(loggerMock.error).toHaveBeenCalledWith('Failed to find refresh token by traceId', { traceId: message.uuid })
            })
        })

        describe('when it is not nfc flow', () => {
            it('should successfully mark request as identified', async () => {
                const message: EventPayload = {
                    uuid: randomUUID(),
                    response: {
                        requestId: randomUUID(),
                        documents: [],
                    },
                }

                jest.spyOn(nfcServiceMock, 'nfcUserDataExists').mockResolvedValueOnce(false)
                jest.spyOn(photoIdAuthRequestServiceMock, 'markRequestAsIdentified').mockResolvedValueOnce()

                expect(await faceRecoAuthPhotoVerificationEventListener.handler(message)).toBeUndefined()
                expect(nfcServiceMock.nfcUserDataExists).toHaveBeenCalledWith(message.response?.requestId)
                expect(photoIdAuthRequestServiceMock.markRequestAsIdentified).toHaveBeenCalledWith(
                    message.response?.requestId,
                    message.response?.documents,
                )
            })
        })

        it.each([
            [
                'error is present in event payload',
                <EventPayload>{ uuid: randomUUID(), error: { http_code: 400, message: 'invalid input' } },
            ],
            ['response is not present in event payload', <EventPayload>{ uuid: randomUUID(), response: undefined }],
        ])('should throw bad request error in case %s', async (_msg: string, message: EventPayload) => {
            await expect(async () => {
                await faceRecoAuthPhotoVerificationEventListener.handler(message)
            }).rejects.toEqual(new BadRequestError('Error on user photo verification', { error: message.error }))
        })
    })
})
