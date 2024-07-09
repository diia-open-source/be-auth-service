import { randomUUID } from 'node:crypto'

const uuidV4Stub = jest.fn()
const phoneticCheckerMock = { getEqualityCoefficient: jest.fn() }

jest.mock('uuid', () => ({ v4: uuidV4Stub }))
jest.mock('@diia-inhouse/utils', () => ({ phoneticChecker: phoneticCheckerMock }))

import { AnalyticsActionResult, AnalyticsService } from '@diia-inhouse/analytics'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import NfcProvider from '@services/authMethods/nfc'
import NfcService from '@services/nfc'

import { AppConfig } from '@interfaces/config'
import { AnalyticsActionType, AnalyticsCategory, ProcessCode } from '@interfaces/services'
import { GenderAsSex } from '@interfaces/services/authMethods'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { DocumentTypeCamelCase } from '@interfaces/services/documents'

describe('NfcProvider', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const nfcServiceMock = mockInstance(NfcService)
    const analyticsServiceMock = mockInstance(AnalyticsService)

    describe('method: requestAuthorizationUrl', () => {
        it('should successfully build and return auth url', async () => {
            const requestId = randomUUID()
            const config = <AppConfig>{
                nfc: {
                    authUrlHost: 'nfc-service.ua',
                },
            }
            const {
                nfc: { authUrlHost },
            } = config

            const nfcProvider = new NfcProvider(config, loggerMock, nfcServiceMock, analyticsServiceMock)

            uuidV4Stub.mockReturnValueOnce(requestId)

            expect(await nfcProvider.requestAuthorizationUrl()).toBe(`${authUrlHost}/${requestId}`)

            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(loggerMock.info).toHaveBeenCalledWith('Created authorization url for nfc', { requestId })
        })
    })

    describe('method: verify', () => {
        const requestId = randomUUID()
        const headers = testKit.session.getHeaders()
        const { user } = testKit.session.getUserSession()
        const config = <AppConfig>{
            nfc: {
                authUrlHost: 'nfc-service.ua',
                phoneticEqualityThreshold: 0.75,
            },
        }
        const nfcUserDto: NfcUserDTO = {
            issuingState: 'UA',
            docNumber: randomUUID(),
            birthDay: user.birthDay,
            docType: DocumentTypeCamelCase.foreignPassport,
            firstName: user.fName,
            gender: GenderAsSex.F,
            itn: user.itn,
            lastName: user.lName,
            middleName: user.mName,
            recordNumber: randomUUID(),
        }

        it('should successfully verify user nfc data when user session is present', async () => {
            const { mobileUid } = headers
            const fNameEquality = 0.8
            const lNameEquality = 0.8

            const nfcProvider = new NfcProvider(config, loggerMock, nfcServiceMock, analyticsServiceMock)

            jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
            jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(nfcUserDto)
            phoneticCheckerMock.getEqualityCoefficient.mockReturnValueOnce(fNameEquality)
            phoneticCheckerMock.getEqualityCoefficient.mockReturnValueOnce(lNameEquality)

            expect(await nfcProvider.verify(requestId, { headers, user })).toEqual(nfcUserDto)

            expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
            expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
            expect(phoneticCheckerMock.getEqualityCoefficient).toHaveBeenCalledWith(nfcUserDto.firstName, user.fName)
            expect(phoneticCheckerMock.getEqualityCoefficient).toHaveBeenCalledWith(nfcUserDto.lastName, user.lName)
            expect(analyticsServiceMock.log).toHaveBeenCalledWith(
                AnalyticsCategory.ResidencePermitNfcAdding,
                AnalyticsActionType.MetaphoneCheck,
                AnalyticsActionResult.Success,
                {
                    etalonNameLength: nfcUserDto.firstName.length,
                    slaveNameLength: user.fName.length,
                    etalonLastNameLength: nfcUserDto.lastName.length,
                    slaveLastNameLength: user.lName.length,
                    nameEquality: fNameEquality,
                    lastNameEquality: lNameEquality,
                    strictNameEquality: nfcUserDto.firstName.toUpperCase() === user.fName.toUpperCase(),
                    strictLastNameEquality: nfcUserDto.lastName.toUpperCase() === user.lName.toUpperCase(),
                },
            )
        })

        it('should successfully verify user nfc data when user session is not present', async () => {
            const { mobileUid } = headers

            const nfcProvider = new NfcProvider(config, loggerMock, nfcServiceMock, analyticsServiceMock)

            jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
            jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(nfcUserDto)

            expect(await nfcProvider.verify(requestId, { headers })).toEqual(nfcUserDto)

            expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
            expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
        })

        it.each([
            [
                'user photo is not verified',
                new AccessDeniedError(),
                (): void => {
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(false)
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                },
            ],
            [
                'user nfc data not found',
                new NotFoundError('User data not found'),
                (): void => {
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(<NfcUserDTO>{})
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                },
            ],
            [
                'user nfc data invalid, reason: itn is missing in passport',
                new BadRequestError('Invalid user data', { userData: { docType: DocumentTypeCamelCase.idCard } }),
                (): void => {
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(<NfcUserDTO>{
                        docType: DocumentTypeCamelCase.idCard,
                    })
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                },
            ],
            [
                'user nfc data invalid, reason: docNumber is missing',
                new BadRequestError('Invalid user data', { userData: { docType: DocumentTypeCamelCase.idCard, itn: user.itn } }),
                (): void => {
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(<NfcUserDTO>{
                        docType: DocumentTypeCamelCase.idCard,
                        itn: user.itn,
                    })
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                },
            ],
            [
                'user nfc data invalid, reason: birthDay is missing',
                new BadRequestError('Invalid user data', {
                    userData: { docType: DocumentTypeCamelCase.idCard, itn: user.itn, docNumber: nfcUserDto.docNumber },
                }),
                (): void => {
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(<NfcUserDTO>{
                        docType: DocumentTypeCamelCase.idCard,
                        itn: user.itn,
                        docNumber: nfcUserDto.docNumber,
                    })
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                },
            ],
            [
                'user nfc data invalid, reason: gender is missing',
                new BadRequestError('Invalid user data', {
                    userData: {
                        docType: DocumentTypeCamelCase.idCard,
                        itn: user.itn,
                        docNumber: nfcUserDto.docNumber,
                        birthDay: nfcUserDto.birthDay,
                    },
                }),
                (): void => {
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(<NfcUserDTO>{
                        docType: DocumentTypeCamelCase.idCard,
                        itn: user.itn,
                        docNumber: nfcUserDto.docNumber,
                        birthDay: nfcUserDto.birthDay,
                    })
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                },
            ],
            [
                'BirthDays are not equal',
                new AccessDeniedError('Auth error', {}, ProcessCode.ResidencePermitInvalidData),
                (): void => {
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(<NfcUserDTO>{
                        docType: DocumentTypeCamelCase.idCard,
                        itn: user.itn,
                        docNumber: nfcUserDto.docNumber,
                        birthDay: 'other-birth-date',
                        gender: nfcUserDto.gender,
                    })
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                    expect(loggerMock.error).toHaveBeenCalledWith('BirthDays are not equal')
                },
            ],
            [
                'phoneticChecker dost not satisfied',
                new AccessDeniedError('Auth error', {}, ProcessCode.ResidencePermitInvalidData),
                (): void => {
                    jest.spyOn(nfcServiceMock, 'isUserPhotoVerified').mockResolvedValueOnce(true)
                    jest.spyOn(nfcServiceMock, 'getUserDataFromCache').mockResolvedValueOnce(nfcUserDto)
                    phoneticCheckerMock.getEqualityCoefficient.mockReturnValueOnce(0.7)
                    phoneticCheckerMock.getEqualityCoefficient.mockReturnValueOnce(0.7)
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nfcServiceMock.isUserPhotoVerified).toHaveBeenCalledWith(mobileUid)
                    expect(nfcServiceMock.getUserDataFromCache).toHaveBeenCalledWith(mobileUid)
                    expect(loggerMock.error).toHaveBeenCalledWith('BirthDays are not equal')
                    expect(phoneticCheckerMock.getEqualityCoefficient).toHaveBeenCalledWith(nfcUserDto.firstName, user.fName)
                    expect(phoneticCheckerMock.getEqualityCoefficient).toHaveBeenCalledWith(nfcUserDto.lastName, user.lName)
                    expect(analyticsServiceMock.log).toHaveBeenCalledWith(
                        AnalyticsCategory.ResidencePermitNfcAdding,
                        AnalyticsActionType.MetaphoneCheck,
                        AnalyticsActionResult.Error,
                        {
                            etalonNameLength: nfcUserDto.firstName.length,
                            slaveNameLength: user.fName.length,
                            etalonLastNameLength: nfcUserDto.lastName.length,
                            slaveLastNameLength: user.lName.length,
                            nameEquality: 0.7,
                            lastNameEquality: 0.7,
                            strictNameEquality: nfcUserDto.firstName.toUpperCase() === user.fName.toUpperCase(),
                            strictLastNameEquality: nfcUserDto.lastName.toUpperCase() === user.lName.toUpperCase(),
                        },
                    )
                },
            ],
        ])(
            'should fail with error in case %s',
            async (_msg: string, expectedError: Error, defineSpies: CallableFunction, checkExpectations: CallableFunction) => {
                const nfcProvider = new NfcProvider(config, loggerMock, nfcServiceMock, analyticsServiceMock)

                defineSpies()

                await expect(async () => {
                    await nfcProvider.verify(requestId, { headers, user })
                }).rejects.toEqual(expectedError)

                checkExpectations()
            },
        )
    })
})
