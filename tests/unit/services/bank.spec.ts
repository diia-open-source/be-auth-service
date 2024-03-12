import { RedlockMutex } from 'redis-semaphore'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { HttpService } from '@diia-inhouse/http'
import { RedlockService, StoreService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode, PlatformType } from '@diia-inhouse/types'

import BankService from '@services/bank'
import FakeBankLoginService from '@services/fakeBankLogin'

import BankDataMapper from '@dataMappers/bankDataMapper'

import { AppConfig } from '@interfaces/config'
import { BankIdUser } from '@interfaces/services/authMethods/bankId'
import { BankIdResponse } from '@interfaces/services/bank'

describe(`${BankService.name}`, () => {
    const testKit = new TestKit()
    const config = <AppConfig>(<unknown>{
        bankId: {
            host: 'host',
            rejectUnauthorized: false,
        },
    })

    const bank1 = {
        name: 'bank',
        logoUrl: 'url',
        workable: true,
        bankId: 'id',
        memberId: 'id',
        sortOrder: 1,
    }
    const bank2 = {
        name: 'bank2',
        logoUrl: 'url',
        workable: true,
        bankId: 'id2',
        memberId: 'id2',
        sortOrder: 2,
    }

    const mockLogger = mockInstance(DiiaLogger)
    const httpServiceMock = mockInstance(HttpService)
    const storeMockService = mockInstance(StoreService)
    const bankDataMapper = new BankDataMapper(config)
    const fakeBankLoginService = new FakeBankLoginService(mockLogger)
    const redlockService = mockInstance(RedlockService)
    const bankService = new BankService(
        config,
        mockLogger,
        redlockService,
        storeMockService,
        httpServiceMock,
        fakeBankLoginService,
        bankDataMapper,
    )

    describe('method: `onInit`', () => {
        it('should successfully init data', async () => {
            const cacheKey = 'bank'
            const keys = ['key1', 'key2']
            const banksJson = [JSON.stringify(bank1), JSON.stringify(bank2)]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lock = new RedlockMutex(<any>[], 'key')

            jest.spyOn(redlockService, 'lock').mockResolvedValue(lock)
            jest.spyOn(storeMockService, 'keys').mockResolvedValueOnce(keys)
            jest.spyOn(storeMockService, 'mget').mockResolvedValueOnce(banksJson)
            jest.spyOn(lock, 'release').mockResolvedValue()

            await bankService.onInit()

            expect(redlockService.lock).toHaveBeenCalledWith('banks-init')
            expect(storeMockService.keys).toHaveBeenCalledWith(`${cacheKey}.*`)
            expect(storeMockService.mget).toHaveBeenCalledWith(...keys)
            expect(lock.release).toHaveBeenCalledWith()
        })

        it('should update bank list during init data', async () => {
            const cacheKey = 'bank'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lock = new RedlockMutex(<any>[], 'key')

            jest.spyOn(redlockService, 'lock').mockResolvedValue(lock)
            jest.spyOn(storeMockService, 'keys').mockResolvedValueOnce([])
            jest.spyOn(bankService, 'updateBanksList').mockResolvedValueOnce()
            jest.spyOn(lock, 'release').mockResolvedValue()

            await bankService.onInit()

            expect(redlockService.lock).toHaveBeenCalledWith('banks-init')
            expect(storeMockService.keys).toHaveBeenCalledWith(`${cacheKey}.*`)
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to find bank keys')
            expect(mockLogger.info).toHaveBeenCalledWith('Banks are absent, start loading')
            expect(lock.release).toHaveBeenCalledWith()
        })
    })

    describe('method: `updateBanksList`', () => {
        it('should update banks list', async () => {
            const mockBankIdResponse: BankIdResponse[] = [
                { id: 'id', name: 'name', workable: true, memberId: 'memberId', logoUrl: 'logoUrl', loginUrl: 'loginUrl', order: 1 },
            ]

            jest.spyOn(httpServiceMock, 'get').mockResolvedValueOnce([null, { statusCode: HttpStatusCode.OK, data: mockBankIdResponse }])
            jest.spyOn(storeMockService, 'set').mockResolvedValueOnce('OK')

            await bankService.updateBanksList()

            expect(httpServiceMock.get).toHaveBeenCalledWith({
                host: config.bankId.host,
                path: '/api/banks',
                timeout: 10000,
                rejectUnauthorized: config.bankId.rejectUnauthorized,
            })
            expect(mockLogger.debug).toHaveBeenCalledWith('Bank list from BankID', mockBankIdResponse)
            expect(mockLogger.info).toHaveBeenCalledWith('Banks updating bulk result', ['OK'])
        })

        it('should return undefined if not found any banks', async () => {
            jest.spyOn(httpServiceMock, 'get').mockResolvedValueOnce([new Error('Error'), undefined])

            expect(await bankService.updateBanksList()).toBeUndefined()

            expect(httpServiceMock.get).toHaveBeenCalledWith({
                host: config.bankId.host,
                path: '/api/banks',
                timeout: 10000,
                rejectUnauthorized: config.bankId.rejectUnauthorized,
            })
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get bank-id banks', new Error('Error'))
        })

        it('should return undefined if not found bank host', async () => {
            const copyConfig = structuredClone(config)

            copyConfig.bankId.host = ''

            const newBankService = new BankService(
                copyConfig,
                mockLogger,
                <RedlockService>{},
                storeMockService,
                httpServiceMock,
                <FakeBankLoginService>{},
                bankDataMapper,
            )

            expect(await newBankService.updateBanksList()).toBeUndefined()

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get bank-id banks: unknown api host')
        })
    })

    describe('method: `getBanks`', () => {
        it('should return list with one bank', async () => {
            const headers = testKit.session.getHeaders()
            const fakeBankLoginSettings = {
                isActive: true,
                bank: {
                    name: 'bank',
                    logoUrl: 'url',
                    workable: true,
                    bankId: 'id',
                    memberId: 'id',
                    sortOrder: 1,
                },
                authorizationUrl: 'url',
                requestId: 'requestId',
                bankIdUser: <BankIdUser>{},
                appVersions: { [PlatformType.Android]: '1.0.0' },
            }
            const { bankId, memberId, sortOrder, ...bankObj } = fakeBankLoginSettings.bank
            const banks = [bankObj]

            jest.spyOn(fakeBankLoginService, 'getFakeDataToApply').mockResolvedValueOnce(fakeBankLoginSettings)

            expect(await bankService.getBanks(headers)).toMatchObject(banks)
            expect(fakeBankLoginService.getFakeDataToApply).toHaveBeenCalledWith(headers.platformType, headers.appVersion)
        })

        it('should return empty array if failed to find bank keys', async () => {
            const headers = testKit.session.getHeaders()

            jest.spyOn(fakeBankLoginService, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
            jest.spyOn(storeMockService, 'keys').mockResolvedValueOnce([])

            expect(await bankService.getBanks(headers)).toMatchObject([])
            expect(mockLogger.error).toHaveBeenCalledWith(`Failed to find bank keys`)
        })

        it('should return empty array if failed to find banks by keys', async () => {
            const headers = testKit.session.getHeaders()
            const keys = ['key1']

            jest.spyOn(fakeBankLoginService, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
            jest.spyOn(storeMockService, 'keys').mockResolvedValueOnce(keys)
            jest.spyOn(storeMockService, 'mget').mockResolvedValueOnce([])

            expect(await bankService.getBanks(headers)).toMatchObject([])
            expect(mockLogger.error).toHaveBeenCalledWith(`Failed to find banks by keys`)
        })

        it('should return list of banks', async () => {
            const headers = testKit.session.getHeaders()
            const keys = ['key1']
            const banksJson = [JSON.stringify(bank1), JSON.stringify(bank2)]

            jest.spyOn(fakeBankLoginService, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
            jest.spyOn(storeMockService, 'keys').mockResolvedValueOnce(keys)
            jest.spyOn(storeMockService, 'mget').mockResolvedValueOnce(banksJson)

            expect(await bankService.getBanks(headers)).toMatchObject([
                { name: bank1.name, logoUrl: bank1.logoUrl, workable: bank1.workable },
                { name: bank2.name, logoUrl: bank2.logoUrl, workable: bank2.workable },
            ])
        })

        it('should return empty array if failed to find workable banks in list', async () => {
            const headers = testKit.session.getHeaders()
            const keys = ['key1']
            const notWorkableBank = {
                name: 'bank',
                logoUrl: 'url',
                workable: false,
                bankId: 'id',
                memberId: 'id',
                sortOrder: 1,
            }
            const banksJson = [JSON.stringify(notWorkableBank)]

            jest.spyOn(fakeBankLoginService, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
            jest.spyOn(storeMockService, 'keys').mockResolvedValueOnce(keys)
            jest.spyOn(storeMockService, 'mget').mockResolvedValueOnce(banksJson)

            expect(await bankService.getBanks(headers)).toMatchObject([])
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to find workable banks in list', { banks: [] })
        })
    })

    describe('method: `getBankName`', () => {
        it('should return name of a bank', async () => {
            const cacheKey = 'bank'
            const bankId = 'bankId'
            const mockBank = JSON.stringify({
                name: 'bank',
                logoUrl: 'url',
                workable: true,
                bankId: 'id',
                memberId: 'id',
                sortOrder: 1,
            })

            jest.spyOn(storeMockService, 'get').mockResolvedValueOnce(mockBank)

            expect(await bankService.getBankName(bankId)).toBe('bank')
            expect(storeMockService.get).toHaveBeenCalledWith(`${cacheKey}.${bankId}`)
        })

        it('should return empty string if not found bank by bankId', async () => {
            const bankId = 'bankId'

            jest.spyOn(storeMockService, 'get').mockResolvedValueOnce(null)

            expect(await bankService.getBankName(bankId)).toBe('')
            expect(mockLogger.error).toHaveBeenCalledWith(`Failed to find bank by bankId [${bankId}]`)
        })
    })

    describe('method: `getBankMemberId`', () => {
        it('should return memberId of a bank', async () => {
            const cacheKey = 'bank'
            const bankId = 'bankId'
            const mockBank = JSON.stringify({
                name: 'bank',
                logoUrl: 'url',
                workable: true,
                bankId: 'id',
                memberId: 'id',
                sortOrder: 1,
            })

            jest.spyOn(storeMockService, 'get').mockResolvedValueOnce(mockBank)

            expect(await bankService.getBankMemberId(bankId)).toBe('id')
            expect(storeMockService.get).toHaveBeenCalledWith(`${cacheKey}.${bankId}`)
        })

        it('should return empty string if not found bank by bankId', async () => {
            const bankId = 'bankId'

            jest.spyOn(storeMockService, 'get').mockResolvedValueOnce(null)

            expect(await bankService.getBankMemberId(bankId)).toBe('')
            expect(mockLogger.error).toHaveBeenCalledWith(`Failed to find bank by bankId [${bankId}]`)
        })
    })

    describe('method: `isBankWorkable`', () => {
        it('should return true if bank is workable', async () => {
            const cacheKey = 'bank'
            const bankId = 'bankId'
            const mockBank = JSON.stringify({
                name: 'bank',
                logoUrl: 'url',
                workable: true,
                bankId: 'id',
                memberId: 'id',
                sortOrder: 1,
            })

            jest.spyOn(storeMockService, 'get').mockResolvedValueOnce(mockBank)

            expect(await bankService.isBankWorkable(bankId)).toBe(true)
            expect(storeMockService.get).toHaveBeenCalledWith(`${cacheKey}.${bankId}`)
        })

        it('should return false if not found bank by bankId', async () => {
            const bankId = 'bankId'

            jest.spyOn(storeMockService, 'get').mockResolvedValueOnce(null)

            expect(await bankService.isBankWorkable(bankId)).toBe(false)
            expect(mockLogger.error).toHaveBeenCalledWith(`Failed to find bank by bankId [${bankId}]`)
        })
    })
})
