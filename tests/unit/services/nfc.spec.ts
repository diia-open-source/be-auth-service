import { IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalCommunicator, ExternalEventBus } from '@diia-inhouse/diia-queue'
import { ModelNotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentTypeCamelCase, DurationS } from '@diia-inhouse/types'

import NfcService from '@services/nfc'
import UserService from '@services/user'

import NfcDataMapper from '@dataMappers/nfcDataMapper'

import { GenderAsSex } from '@interfaces/services/authMethods'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { NfcVerificationRequest } from '@interfaces/services/nfc'

describe(`${NfcService.name}`, () => {
    const identifierService = new IdentifierService({ salt: 'salt' })
    const testKit = new TestKit()
    const nfcDataMapper = new NfcDataMapper()
    const loggerServiceMock = mockInstance(DiiaLogger)
    const cacheServiceMock = mockInstance(CacheService)
    const externalEventBusMock = mockInstance(ExternalEventBus)
    const externalCommunicatorMock = mockInstance(ExternalCommunicator)
    const userServiceMock = mockInstance(UserService)

    const nfcService = new NfcService(
        cacheServiceMock,
        loggerServiceMock,
        externalCommunicatorMock,
        identifierService,
        externalEventBusMock,
        userServiceMock,
        nfcDataMapper,
    )

    const cacheTtlInSec = DurationS.Minute * 10
    const userPhotoVerifiedCacheKeyPrefix = 'nfc.user.photo.verification.'
    const userDataCacheKeyPrefix = 'nfc.user.data.'
    const nfcVerificationKeyPrefix = 'facerecognition.nfc.user.verification.'

    const mobileUuid = 'mobileUuid'
    const itn = testKit.session.generateItn(testKit.session.getBirthDate(), testKit.session.getGender(), false)

    describe('method: `saveUserPhotoVerificationResult`', () => {
        it('should successfully save user photo verification result in cache', async () => {
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await nfcService.saveUserPhotoVerificationResult(mobileUuid, true)).toBeUndefined()
            expect(cacheServiceMock.set).toHaveBeenCalledWith(
                `${userPhotoVerifiedCacheKeyPrefix}${mobileUuid}`,
                JSON.stringify({ verified: true }),
                cacheTtlInSec,
            )
        })
    })

    describe('method: `saveUserData`', () => {
        it('should successfully save user data in cache', async () => {
            const userData = <NfcUserDTO>{}

            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await nfcService.saveUserData(mobileUuid, userData)).toBeUndefined()
            expect(cacheServiceMock.set).toHaveBeenCalledWith(
                `${userDataCacheKeyPrefix}${mobileUuid}`,
                JSON.stringify(userData),
                cacheTtlInSec,
            )
        })
    })

    describe('method: `saveNfcVerificationRequest`', () => {
        it('should successfully save nfc verification request in cache', async () => {
            const request = <NfcVerificationRequest>{}

            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await nfcService.saveNfcVerificationRequest(mobileUuid, request)).toBeUndefined()
            expect(cacheServiceMock.set).toHaveBeenCalledWith(
                `${nfcVerificationKeyPrefix}${mobileUuid}`,
                JSON.stringify(request),
                cacheTtlInSec,
            )
        })
    })

    describe('method: `isUserPhotoVerified`', () => {
        it('should return true if user photo verified', async () => {
            const cacheData = JSON.stringify({ verified: true })

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(cacheData)

            expect(await nfcService.isUserPhotoVerified(mobileUuid)).toBeTruthy()
            expect(cacheServiceMock.get).toHaveBeenCalledWith(`${userPhotoVerifiedCacheKeyPrefix}${mobileUuid}`)
            expect(loggerServiceMock.info).toHaveBeenCalledWith('User photo verification result', { verifyPhotoResult: { verified: true } })
        })

        it('should return false if cached photo not found', async () => {
            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(null)

            expect(await nfcService.isUserPhotoVerified(mobileUuid)).toBeFalsy()
            expect(loggerServiceMock.error).toHaveBeenCalledWith('No cache about photo verification')
        })
    })

    describe('method: `getUserDataFromCache`', () => {
        it('should get user data from cache', async () => {
            const userData = <NfcUserDTO>{}
            const stringifiedUserData = JSON.stringify(userData)
            const key = `${userDataCacheKeyPrefix}${mobileUuid}`

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(stringifiedUserData)
            jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)

            expect(await nfcService.getUserDataFromCache(mobileUuid)).toMatchObject(userData)
            expect(cacheServiceMock.get).toHaveBeenCalledWith(key)
            expect(cacheServiceMock.remove).toHaveBeenCalledWith(key)
        })
    })

    describe('method: `nfcUserDataExists`', () => {
        it('should return true if nfc user data exists in cache', async () => {
            const userData = <NfcUserDTO>{}
            const stringifiedUserData = JSON.stringify(userData)

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(stringifiedUserData)

            expect(await nfcService.nfcUserDataExists(mobileUuid)).toBeTruthy()
        })
    })

    describe('method: `saveNfcScanResult`', () => {
        const user = <NfcUserDTO>{
            docType: DocumentTypeCamelCase.foreignPassport,
            docSerie: 'TT',
            docNumber: '12345',
            firstName: 'Надія',
            lastName: 'Дія',
            middleName: 'Володимирівна',
            recordNumber: '1',
            birthDay: '24.08.1991',
            gender: GenderAsSex.F,
            photo: 'photo',
            itn,
            international: true,
        }

        it('should throw ModelNotFoundError if nfc verification request json not found', async () => {
            const verificationRequestKey = `${nfcVerificationKeyPrefix}${mobileUuid}`

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(null)

            await expect(async () => {
                await nfcService.saveNfcScanResult(mobileUuid, user)
            }).rejects.toEqual(new ModelNotFoundError(nfcVerificationKeyPrefix, mobileUuid))
            expect(cacheServiceMock.get).toHaveBeenCalledWith(verificationRequestKey)
        })

        it('should throw Error if failed to receive innByUnzrResponse', async () => {
            const nfcVerificationRequest = {
                uuid: 'uuid',
                request: {
                    mobileUid: 'mobileUid',
                    token: 'token',
                },
            }
            const stringifiedRequest = JSON.stringify(nfcVerificationRequest)

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(stringifiedRequest)
            jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
            jest.spyOn(externalCommunicatorMock, 'receive').mockResolvedValueOnce(undefined)

            const { itn: userItn, international, ...croppedUser } = user

            await expect(async () => {
                await nfcService.saveNfcScanResult(mobileUuid, <NfcUserDTO>croppedUser)
            }).rejects.toEqual(new Error('Failed to exchange unzr on rnokpp'))
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Start exchange unzr on rnokpp')
            expect(loggerServiceMock.error).toHaveBeenCalledWith(`Failed to exchange unzr on rnokpp`, {
                err: new Error('Failed to fetch innByUnzrResponse'),
            })
        })

        it('should throw Error if rnokpp not found', async () => {
            const nfcVerificationRequest = {
                uuid: 'uuid',
                request: {
                    mobileUid: 'mobileUid',
                    token: 'token',
                },
            }
            const stringifiedRequest = JSON.stringify(nfcVerificationRequest)

            const authResponse = {
                firstname: 'firstname',
                lastname: 'lastname',
                middlename: 'middlename',
            }

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(stringifiedRequest)
            jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
            jest.spyOn(externalCommunicatorMock, 'receive').mockResolvedValueOnce(authResponse)

            const { itn: userItn, international, ...croppedUser } = user

            await expect(async () => {
                await nfcService.saveNfcScanResult(mobileUuid, <NfcUserDTO>croppedUser)
            }).rejects.toEqual(new Error('Failed to exchange unzr on rnokpp'))
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Start exchange unzr on rnokpp')
            expect(loggerServiceMock.error).toHaveBeenCalledWith(`Failed to exchange unzr on rnokpp`, {
                err: new Error('Unable to proceed without rnokpp'),
            })
        })

        it('should return mobileUuid after successful saving nfc result', async () => {
            const nfcVerificationRequest = {
                uuid: 'uuid',
                request: {
                    mobileUid: 'mobileUid',
                    token: 'token',
                },
            }
            const stringifiedRequest = JSON.stringify(nfcVerificationRequest)

            const authResponse = {
                rnokpp: 'rnokpp',
                firstname: 'firstname',
                lastname: 'lastname',
                middlename: 'middlename',
            }

            const identifier = 'identifier'
            const points = [10, 20, 30]

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(stringifiedRequest)
            jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)
            jest.spyOn(externalCommunicatorMock, 'receive').mockResolvedValueOnce(authResponse)
            jest.spyOn(identifierService, 'createIdentifier').mockReturnValueOnce(identifier)
            jest.spyOn(userServiceMock, 'createDocumentFeaturePoints').mockResolvedValueOnce({ points })
            jest.spyOn(nfcService, 'saveUserData').mockResolvedValueOnce()
            jest.spyOn(externalEventBusMock, 'publish').mockResolvedValueOnce(true)

            const { itn: userItn, international, ...croppedUser } = user

            expect(await nfcService.saveNfcScanResult(mobileUuid, <NfcUserDTO>croppedUser)).toBe(mobileUuid)

            expect(loggerServiceMock.info).toHaveBeenCalledWith(`Successfully saved user data for session ${mobileUuid}`)
        })
    })
})
