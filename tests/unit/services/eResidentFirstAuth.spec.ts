import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { BadRequestError, ExternalCommunicatorError, NotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import EResidentFirstAuthService from '@services/eResidentFirstAuth'

import { ExternalEvent } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'
import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'

describe(`${EResidentFirstAuthService.name}`, () => {
    const testKit = new TestKit()
    const config = <AppConfig>(<unknown>{
        authService: {
            isEnabled: false,
            schema: { schemaMap: { [AuthSchemaCode.EResidentFirstAuth]: { tokenParamsCacheTtl: 10000 } } },
        },
    })
    const mockLogger = mockInstance(DiiaLogger)
    const externalCommunicatorMock = mockInstance(ExternalCommunicator)
    const cacheServiceMock = mockInstance(CacheService)

    const eResidentFirstAuthService = new EResidentFirstAuthService(config, mockLogger, externalCommunicatorMock, cacheServiceMock)
    const mobileUuid = 'mobileUuid'
    const itn = testKit.session.generateItn(testKit.session.getBirthDate(), testKit.session.getGender(), false)

    describe('method: `saveQrCodeTokenInCache`', () => {
        const cacheKey = `authSchema.eResidentQrCode.token_${mobileUuid}`
        const qrCodePayload = { token: 'token' }

        it('should successfully save token in cache', async () => {
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            await eResidentFirstAuthService.saveQrCodeTokenInCache(AuthSchemaCode.EResidentFirstAuth, mobileUuid, qrCodePayload)
            expect(cacheServiceMock.set).toHaveBeenCalledWith(cacheKey, qrCodePayload.token, 10)
        })

        it('should save token in cache with defaultSchemaTtl', async () => {
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            await eResidentFirstAuthService.saveQrCodeTokenInCache(AuthSchemaCode.Authorization, mobileUuid, qrCodePayload)
            expect(cacheServiceMock.set).toHaveBeenCalledWith(cacheKey, qrCodePayload.token, 10)
        })
    })

    describe('method: `confirmAuth`', () => {
        const token = 'token'
        const response = {
            http_code: HttpStatusCode.OK,
            message: 'OK',
        }

        it('should throw NotFoundError if qrCode not found in cache', async () => {
            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(null)

            await expect(async () => {
                await eResidentFirstAuthService.confirmAuth(itn, mobileUuid)
            }).rejects.toEqual(new NotFoundError('Failed to confirm first auth', ProcessCode.EResidentQrCodeFail))
        })

        it('should throw ExternalCommunicatorError if external request failed', async () => {
            const err = new BadRequestError('failed communication')

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(token)
            jest.spyOn(externalCommunicatorMock, 'receive').mockRejectedValueOnce(err)

            await expect(async () => {
                await eResidentFirstAuthService.confirmAuth(itn, mobileUuid)
            }).rejects.toEqual(new ExternalCommunicatorError('Failed to confirm first auth', HttpStatusCode.BAD_REQUEST, { err }))

            expect(externalCommunicatorMock.receive).toHaveBeenCalledWith(ExternalEvent.EResidentAuthConfirmation, {
                itn,
                qrCodeToken: token,
            })
        })

        it('should successfully confirm auth', async () => {
            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(token)
            jest.spyOn(externalCommunicatorMock, 'receive').mockResolvedValueOnce(response)

            await eResidentFirstAuthService.confirmAuth(itn, mobileUuid)

            expect(mockLogger.info).toHaveBeenCalledWith('Successfully confirmed e-resident first auth')
            expect(externalCommunicatorMock.receive).toHaveBeenCalledWith(ExternalEvent.EResidentAuthConfirmation, {
                itn,
                qrCodeToken: token,
            })
        })
    })
})
