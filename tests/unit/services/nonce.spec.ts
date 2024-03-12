import DiiaLogger from '@diia-inhouse/diia-logger'
import { NotFoundError } from '@diia-inhouse/errors'
import { StoreService } from '@diia-inhouse/redis'
import { mockInstance } from '@diia-inhouse/test'

import NonceService from '@services/nonce'

describe(`${NonceService.name}`, () => {
    const loggerServiceMock = mockInstance(DiiaLogger)
    const storeServiceMock = mockInstance(StoreService)

    const nonceService = new NonceService(loggerServiceMock, storeServiceMock)

    const deviceUuid = 'deviceUuid'

    describe('method: `getNonceAndRemove`', () => {
        it('should throw NotFoundError if nonce not found', async () => {
            const errorMessage = 'Generated nonce was not found'

            await expect(async () => {
                await nonceService.getNonceAndRemove(deviceUuid)
            }).rejects.toEqual(new NotFoundError(errorMessage))
            expect(loggerServiceMock.error).toHaveBeenCalledWith(
                `${errorMessage}. Reason: There is no nonce in cache associated with ${{ deviceUuid }}`,
            )
        })

        it('should return nonce', async () => {
            const nonce = 'nonce'

            jest.spyOn(storeServiceMock, 'get').mockResolvedValueOnce(nonce)
            jest.spyOn(storeServiceMock, 'remove').mockResolvedValueOnce(1)

            expect(await nonceService.getNonceAndRemove(deviceUuid)).toBe(nonce)
        })
    })

    describe('method: `saveNonce`', () => {
        it('should successfully save nonce in cache', async () => {
            const nonce = 'nonce'
            const nonceCacheTtl = 1000

            jest.spyOn(storeServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await nonceService.saveNonce(deviceUuid, nonce, nonceCacheTtl)).toBeUndefined()
        })
    })
})
