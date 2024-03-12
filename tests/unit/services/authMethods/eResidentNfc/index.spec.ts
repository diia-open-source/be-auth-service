import { randomUUID } from 'crypto'

const uuidV4Stub = jest.fn()

jest.mock('uuid', () => ({ v4: uuidV4Stub }))

import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, NotFoundError, UnauthorizedError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import EResidentNfcProvider from '@services/authMethods/eResidentNfc'
import DocumentsService from '@services/documents'
import NfcService from '@services/nfc'

import { ProcessCode } from '@interfaces/services'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { EResidencyCountryInfo } from '@interfaces/services/documents'

describe('EResidentNfcProvider', () => {
    const testKit = new TestKit()
    const cacheServiceMock = mockInstance(CacheService)
    const loggerMock = mockInstance(DiiaLogger)
    const documentsServiceMock = mockInstance(DocumentsService)
    const nfcServiceMock = mockInstance(NfcService)

    describe('method: requestAuthorizationUrl', () => {
        const headers = testKit.session.getHeaders()
        const requestId = randomUUID()

        it('should successfully return authorization url', async () => {
            const { mobileUid } = headers
            const eResidentNfcProvider = new EResidentNfcProvider(cacheServiceMock, loggerMock, documentsServiceMock, nfcServiceMock)

            uuidV4Stub.mockReturnValue(requestId)
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await eResidentNfcProvider.requestAuthorizationUrl({}, headers)).toEqual(requestId)

            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(cacheServiceMock.set).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`, requestId, 900)
        })
    })

    describe('method: verify', () => {
        const headers = testKit.session.getHeaders()
        const requestId = randomUUID()
        const eResidencyCountriesInfo: EResidencyCountryInfo[] = [<EResidencyCountryInfo>{ alpha3: 'PL', isCountryResidence: true }]
        const nfcUserDto = <NfcUserDTO>{
            issuingState: 'PL',
            docNumber: randomUUID(),
        }

        it('should successfully verify nfc and return EResidency data', async () => {
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

            const eResidentNfcProvider = new EResidentNfcProvider(cacheServiceMock, loggerMock, documentsServiceMock, nfcServiceMock)

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
            jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
            jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
            jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(nfcUserDto)
            jest.spyOn(documentsServiceMock, 'getEResidentCountriesInfo').mockResolvedValueOnce(eResidencyCountriesInfo)
            jest.spyOn(documentsServiceMock, 'getEResidencyToProcess').mockResolvedValueOnce(eResidency)

            expect(await eResidentNfcProvider.verify(requestId, { headers })).toEqual(eResidency)

            expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
            expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
            expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
            expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
            expect(documentsServiceMock.getEResidentCountriesInfo).toHaveBeenCalledWith()
            expect(documentsServiceMock.getEResidencyToProcess).toHaveBeenCalledWith({
                issuingCountry: nfcUserDto.issuingState,
                docNumber: nfcUserDto.docNumber,
                handlePhoto: false,
            })
        })

        it.each([
            [
                'unknown requestId',
                new AccessDeniedError('Unknown requestId'),
                (): void => {
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce('other-request-id')
                    jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                },
            ],
            [
                'user photo is not verified',
                new UnauthorizedError('Photo Identification is not successful', ProcessCode.EResidentPhotoIdFail),
                (): void => {
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
                    jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(false)
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(loggerMock.error).toHaveBeenCalledWith('User photo is not verified')
                },
            ],
            [
                'user data not found in Redis',
                new NotFoundError('User data not found in Redis', ProcessCode.EResidentAuthFail),
                (): void => {
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
                    jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(<NfcUserDTO>{})
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                },
            ],
            [
                'unsupported e-resident country',
                new AccessDeniedError(
                    'Unsupported e-resident country: unsupported-e-resident-country-code',
                    {},
                    ProcessCode.EResidentDocumentNotSupported,
                ),
                (): void => {
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
                    jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce({
                        ...nfcUserDto,
                        issuingState: 'unsupported-e-resident-country-code',
                    })
                    jest.spyOn(documentsServiceMock, 'getEResidentCountriesInfo').mockResolvedValueOnce(eResidencyCountriesInfo)
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                    expect(documentsServiceMock.getEResidentCountriesInfo).toHaveBeenCalledWith()
                },
            ],
            [
                'unable to get EResidency by NFC',
                new NotFoundError('EResidency document not found by NFC', ProcessCode.EResidentAuthFail),
                (): void => {
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
                    jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(nfcUserDto)
                    jest.spyOn(documentsServiceMock, 'getEResidentCountriesInfo').mockResolvedValueOnce(eResidencyCountriesInfo)
                    jest.spyOn(documentsServiceMock, 'getEResidencyToProcess').mockRejectedValueOnce(
                        new Error('Unable to get EResidency by NFC'),
                    )
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentNfcCode.${mobileUid}`)
                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                    expect(documentsServiceMock.getEResidentCountriesInfo).toHaveBeenCalledWith()
                    expect(documentsServiceMock.getEResidencyToProcess).toHaveBeenCalledWith({
                        issuingCountry: nfcUserDto.issuingState,
                        docNumber: nfcUserDto.docNumber,
                        handlePhoto: false,
                    })
                    expect(loggerMock.error).toHaveBeenCalledWith('Error getting EResidency by NFC', { err: expect.any(Error) })
                },
            ],
        ])(
            'should fail with error in case %s',
            async (_msg: string, expectedError: Error, defineSpies: CallableFunction, checkExpectations: CallableFunction) => {
                const eResidentNfcProvider = new EResidentNfcProvider(cacheServiceMock, loggerMock, documentsServiceMock, nfcServiceMock)

                defineSpies()

                await expect(async () => {
                    await eResidentNfcProvider.verify(requestId, { headers })
                }).rejects.toEqual(expectedError)

                checkExpectations()
            },
        )
    })
})
