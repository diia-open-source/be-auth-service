import { randomUUID } from 'crypto'

const uuidV4Stub = jest.fn()

jest.mock('uuid', () => ({ v4: uuidV4Stub }))

import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import EResidentQrCodeProvider from '@services/authMethods/eResidentQrCode'
import DocumentsService from '@services/documents'

import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { QrCodePayload } from '@interfaces/services/userAuthSteps'

describe('EResidentQrCodeProvider', () => {
    const testKit = new TestKit()
    const cacheServiceMock = mockInstance(CacheService)
    const loggerMock = mockInstance(DiiaLogger)
    const documentsServiceMock = mockInstance(DocumentsService)

    describe('method: requestAuthorizationUrl', () => {
        const headers = testKit.session.getHeaders()
        const requestId = randomUUID()

        it('should successfully return authorization url', async () => {
            const { mobileUid } = headers
            const eResidentQrCodeProvider = new EResidentQrCodeProvider(cacheServiceMock, loggerMock, documentsServiceMock)

            uuidV4Stub.mockReturnValue(requestId)
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await eResidentQrCodeProvider.requestAuthorizationUrl({}, headers)).toEqual(requestId)

            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(cacheServiceMock.set).toHaveBeenCalledWith(`authSchema.eResidentQrCode.${mobileUid}`, requestId, 900)
        })
    })

    describe('method: verify', () => {
        const headers = testKit.session.getHeaders()
        const requestId = randomUUID()
        const qrCodePayload: QrCodePayload = {
            token: 'some-token',
        }

        it('should successfully verify qr code payload and return EResidency data', async () => {
            const { token } = qrCodePayload
            const { mobileUid } = headers
            const { user } = testKit.session.getEResidentSession()
            const eResidency = testKit.docs.getEResidency({
                birthDate: user.birthDay,
                email: user.email,
                firstNameEN: user.fName,
                lastNameEN: user.lName,
                patronymicEN: user.mName,
                itn: user.itn,
            })
            const eResidentQrCodeProvider = new EResidentQrCodeProvider(cacheServiceMock, loggerMock, documentsServiceMock)

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
            jest.spyOn(documentsServiceMock, 'getEResidencyToProcess').mockResolvedValueOnce(eResidency)
            jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)

            expect(await eResidentQrCodeProvider.verify(requestId, { headers, qrCodePayload })).toEqual(eResidency)

            expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentQrCode.${mobileUid}`)
            expect(documentsServiceMock.getEResidencyToProcess).toHaveBeenCalledWith({
                qrCodeToken: token,
                handlePhoto: true,
            })
            expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentQrCode.${mobileUid}`)
        })

        it.each([
            [
                'unknown requestId',
                new AccessDeniedError('Unknown requestId'),
                (): void => {
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce('other-request-id')
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentQrCode.${mobileUid}`)
                },
                qrCodePayload,
            ],
            [
                'qrCodePayload is not provided',
                new BadRequestError(`qrCode is required for ${AuthMethod.EResidentQrCode} auth method`),
                (): void => {
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentQrCode.${mobileUid}`)
                },
                undefined,
            ],
            [
                'is unable to get EResidency document by QR code',
                new NotFoundError('EResidency document not found by QR code', ProcessCode.EResidentQrCodeFail),
                (): void => {
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
                    jest.spyOn(documentsServiceMock, 'getEResidencyToProcess').mockRejectedValueOnce(new Error('Unable to get EResidency'))
                    jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
                },
                (): void => {
                    const { mobileUid } = headers
                    const { token } = qrCodePayload

                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentQrCode.${mobileUid}`)
                    expect(documentsServiceMock.getEResidencyToProcess).toHaveBeenCalledWith({
                        qrCodeToken: token,
                        handlePhoto: true,
                    })
                    expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentQrCode.${mobileUid}`)
                    expect(loggerMock.error).toHaveBeenCalledWith('Error getting EResidency by QR code', { err: expect.any(Error) })
                },
                qrCodePayload,
            ],
        ])(
            'should fail with error in case %s',
            async (
                _msg,
                expectedError: Error,
                defineSpies: CallableFunction,
                checkExpectations: CallableFunction,
                inputQrCodePayload?: QrCodePayload,
            ) => {
                const eResidentQrCodeProvider = new EResidentQrCodeProvider(cacheServiceMock, loggerMock, documentsServiceMock)

                defineSpies()

                await expect(async () => {
                    await eResidentQrCodeProvider.verify(requestId, { headers, qrCodePayload: inputQrCodePayload })
                }).rejects.toEqual(expectedError)

                checkExpectations()
            },
        )
    })
})
