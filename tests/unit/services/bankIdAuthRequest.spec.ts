import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import { mockInstance } from '@diia-inhouse/test'

import BankIdAuthRequestService from '@services/bankIdAuthRequest'

describe(`${BankIdAuthRequestService.name}`, () => {
    const cacheMockService = mockInstance(CacheService)

    const bankIdAuthRequestService = new BankIdAuthRequestService(cacheMockService)
    const bankIdAuthRequestKey = 'bank-id.auth'
    const bankIdAuthRequestExpiration = 300

    const mobileUid = 'mobileUid'
    const bankId = 'bankId'

    describe('method: `createRequest`', () => {
        it('should set value', async () => {
            jest.spyOn(cacheMockService, 'set').mockResolvedValueOnce('OK')

            expect(await bankIdAuthRequestService.createRequest(mobileUid, bankId)).toBeUndefined()
            expect(cacheMockService.set).toHaveBeenCalledWith(`${bankIdAuthRequestKey}.${mobileUid}`, bankId, bankIdAuthRequestExpiration)
        })
    })

    describe('method: `validateRequest`', () => {
        it('should get value', async () => {
            jest.spyOn(cacheMockService, 'get').mockResolvedValueOnce(bankId)

            expect(await bankIdAuthRequestService.validateRequest(mobileUid, bankId)).toBeUndefined()
            expect(cacheMockService.get).toHaveBeenCalledWith(`${bankIdAuthRequestKey}.${mobileUid}`)
        })

        it('should throw BadRequestError if occurred unexpected authorization with bankId', async () => {
            jest.spyOn(cacheMockService, 'get').mockResolvedValueOnce(null)

            await expect(async () => {
                await bankIdAuthRequestService.validateRequest(mobileUid, bankId)
            }).rejects.toEqual(new BadRequestError('Unexpected authorization with bankId'))
            expect(cacheMockService.get).toHaveBeenCalledWith(`${bankIdAuthRequestKey}.${mobileUid}`)
        })

        it('should throw AccessDeniedError if attempted to authorize with wrong bankId', async () => {
            jest.spyOn(cacheMockService, 'get').mockResolvedValueOnce('wrong-bankId')

            await expect(async () => {
                await bankIdAuthRequestService.validateRequest(mobileUid, bankId)
            }).rejects.toEqual(new AccessDeniedError('Attempt to authorize with wrong bankId', { bankId }))
            expect(cacheMockService.get).toHaveBeenCalledWith(`${bankIdAuthRequestKey}.${mobileUid}`)
        })
    })
})
