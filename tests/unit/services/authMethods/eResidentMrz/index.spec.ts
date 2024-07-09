import { randomUUID } from 'node:crypto'

const uuidV4Stub = jest.fn()

jest.mock('uuid', () => ({ v4: uuidV4Stub }))

import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import EResidentMrzProvider from '@services/authMethods/eResidentMrz'
import DocumentsService from '@services/documents'

import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'
import { DocumentType, EResidency, EResidencyCountryInfo } from '@interfaces/services/documents'
import { MrzPayload } from '@interfaces/services/userAuthSteps'

describe('EResidentMrzProvider', () => {
    const testKit = new TestKit()
    const cacheServiceMock = mockInstance(CacheService)
    const loggerMock = mockInstance(DiiaLogger)
    const documentsServiceMock = mockInstance(DocumentsService)

    describe('method: requestAuthorizationUrl', () => {
        const headers = testKit.session.getHeaders()
        const requestId = randomUUID()

        it('should successfully return authorization url', async () => {
            const { mobileUid } = headers
            const eResidentMrzProvider = new EResidentMrzProvider(cacheServiceMock, loggerMock, documentsServiceMock)

            uuidV4Stub.mockReturnValue(requestId)
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await eResidentMrzProvider.requestAuthorizationUrl({}, headers)).toEqual(requestId)

            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(cacheServiceMock.set).toHaveBeenCalledWith(`authSchema.eResidentMrzCode.${mobileUid}`, requestId, 900)
        })
    })

    describe('method: verify', () => {
        const headers = testKit.session.getHeaders()
        const requestId = randomUUID()
        const eResidencyCountriesInfo: EResidencyCountryInfo[] = [<EResidencyCountryInfo>{ alpha3: 'PL', isCountryResidence: true }]
        const mrzPayload: MrzPayload = {
            docNumber: randomUUID(),
            residenceCountry: 'PL',
        }

        it('should successfully verify mrz payload and return EResidency data', async () => {
            const { residenceCountry, docNumber } = mrzPayload
            const { mobileUid } = headers
            const { user } = testKit.session.getEResidentSession()
            const eResidency = testKit.docs.generateDocument<EResidency>(DocumentType.EResidency, {
                birthDate: user.birthDay,
                email: user.email,
                firstNameEN: user.fName,
                lastNameEN: user.lName,
                patronymicEN: user.mName,
                itn: user.itn,
            })
            const eResidentMrzProvider = new EResidentMrzProvider(cacheServiceMock, loggerMock, documentsServiceMock)

            jest.spyOn(documentsServiceMock, 'getEResidentCountriesInfo').mockResolvedValueOnce(eResidencyCountriesInfo)
            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
            jest.spyOn(documentsServiceMock, 'getEResidencyToProcess').mockResolvedValueOnce(eResidency)
            jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)

            expect(await eResidentMrzProvider.verify(requestId, { headers, mrzPayload })).toEqual(eResidency)

            expect(documentsServiceMock.getEResidentCountriesInfo).toHaveBeenCalledWith()
            expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentMrzCode.${mobileUid}`)
            expect(documentsServiceMock.getEResidencyToProcess).toHaveBeenCalledWith({
                issuingCountry: residenceCountry,
                docNumber,
                handlePhoto: true,
            })
            expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentMrzCode.${mobileUid}`)
        })

        it.each([
            [
                'mrzPayload is not provided',
                new BadRequestError(`Mrz payload is required for ${AuthMethod.EResidentMrz} auth method`),
                (): void => {},
                (): void => {},
                undefined,
            ],
            [
                'country is not allowed for EResidence',
                new AccessDeniedError(
                    'Unsupported e-resident country: not-allowed-country-code',
                    {},
                    ProcessCode.EResidentDocumentNotSupported,
                ),
                (): void => {
                    jest.spyOn(documentsServiceMock, 'getEResidentCountriesInfo').mockResolvedValueOnce(eResidencyCountriesInfo)
                },
                (): void => {
                    expect(documentsServiceMock.getEResidentCountriesInfo).toHaveBeenCalledWith()
                },
                <MrzPayload>{ ...mrzPayload, residenceCountry: 'not-allowed-country-code' },
            ],
            [
                'unknown requestId',
                new AccessDeniedError('Unknown requestId'),
                (): void => {
                    jest.spyOn(documentsServiceMock, 'getEResidentCountriesInfo').mockResolvedValueOnce(eResidencyCountriesInfo)
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce('other-request-id')
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(documentsServiceMock.getEResidentCountriesInfo).toHaveBeenCalledWith()
                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentMrzCode.${mobileUid}`)
                },
                mrzPayload,
            ],
            [
                'is unable to get EResidency document by MRZ',
                new NotFoundError('EResidency document not found by MRZ', ProcessCode.EResidentAuthFail),
                (): void => {
                    jest.spyOn(documentsServiceMock, 'getEResidentCountriesInfo').mockResolvedValueOnce(eResidencyCountriesInfo)
                    jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(requestId)
                    jest.spyOn(documentsServiceMock, 'getEResidencyToProcess').mockRejectedValueOnce(new Error('Unable to get EResidency'))
                    jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
                },
                (): void => {
                    const { mobileUid } = headers
                    const { docNumber, residenceCountry } = mrzPayload

                    expect(documentsServiceMock.getEResidentCountriesInfo).toHaveBeenCalledWith()
                    expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentMrzCode.${mobileUid}`)
                    expect(documentsServiceMock.getEResidencyToProcess).toHaveBeenCalledWith({
                        issuingCountry: residenceCountry,
                        docNumber,
                        handlePhoto: true,
                    })
                    expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentMrzCode.${mobileUid}`)
                    expect(loggerMock.error).toHaveBeenCalledWith('Error getting EResidency by MRZ', { err: expect.any(Error) })
                },
                mrzPayload,
            ],
        ])(
            'should fail with error in case %s',
            async (
                _msg,
                expectedError: Error,
                defineSpies: CallableFunction,
                checkExpectations: CallableFunction,
                inputMrzPayload?: MrzPayload,
            ) => {
                const eResidentMrzProvider = new EResidentMrzProvider(cacheServiceMock, loggerMock, documentsServiceMock)

                defineSpies()

                await expect(async () => {
                    await eResidentMrzProvider.verify(requestId, { headers, mrzPayload: inputMrzPayload })
                }).rejects.toEqual(expectedError)

                checkExpectations()
            },
        )
    })
})
