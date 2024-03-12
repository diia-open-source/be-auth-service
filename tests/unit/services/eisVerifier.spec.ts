import DiiaLogger from '@diia-inhouse/diia-logger'
import { ServiceUnavailableError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpService } from '@diia-inhouse/http'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import EisUserApprovalVerificationService from '@services/eisVerifier'

import { AppConfig } from '@interfaces/config'

describe(`${EisUserApprovalVerificationService.name}`, () => {
    const testKit = new TestKit()
    const diiaLoggerMock = mockInstance(DiiaLogger)
    const httpServiceMock = mockInstance(HttpService)

    describe('method: `verify`', () => {
        const headers = testKit.session.getHeaders()
        const itn = testKit.session.generateItn(testKit.session.getBirthDate(), testKit.session.getGender(), false)

        it('should return undefined', async () => {
            const config = <AppConfig>(<unknown>{
                eis: {
                    isEnabled: false,
                },
            })

            const eisUserApprovalVerificationService = new EisUserApprovalVerificationService(config, diiaLoggerMock, httpServiceMock)

            expect(await eisUserApprovalVerificationService.verify(itn, headers)).toBeUndefined()
        })

        it('should throw UnauthorizedError if failed http request', async () => {
            const config = <AppConfig>(<unknown>{
                eis: {
                    isEnabled: true,
                    username: 'username',
                    password: 'password',
                },
                app: {
                    integrationPointsTimeout: 1000,
                },
            })
            const message = 'Get approve from EIS: error'
            const err = new Error('Error')

            jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([err, undefined])

            const eisUserApprovalVerificationService = new EisUserApprovalVerificationService(config, diiaLoggerMock, httpServiceMock)

            await expect(async () => {
                await eisUserApprovalVerificationService.verify(itn, headers)
            }).rejects.toEqual(new UnauthorizedError('Get approve from EIS: error'))
            expect(diiaLoggerMock.error).toHaveBeenCalledWith(message, { err })
        })

        it('should throw ServiceUnavailableError if response has 503 status code', async () => {
            const config = <AppConfig>(<unknown>{
                eis: {
                    isEnabled: true,
                    username: 'username',
                    password: 'password',
                },
                app: {
                    integrationPointsTimeout: 1000,
                },
            })

            const response = {
                statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
                body: { errorDescription: 'Service temporarily unavailable' },
                statusMessage: 'Service is unavailable',
            }

            jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([
                null,
                { statusCode: response.statusCode, data: response.body, statusMessage: response.statusMessage },
            ])

            const eisUserApprovalVerificationService = new EisUserApprovalVerificationService(config, diiaLoggerMock, httpServiceMock)

            await expect(async () => {
                await eisUserApprovalVerificationService.verify(itn, headers)
            }).rejects.toEqual(new ServiceUnavailableError())
            expect(diiaLoggerMock.info).toHaveBeenCalledWith('Get approve from EIS: result', {
                statusCode: response.statusCode,
                statusMessage: response.statusMessage,
            })
        })

        it('should throw UnauthorizedError if response is not in 200 or 202 status code', async () => {
            const config = <AppConfig>(<unknown>{
                eis: {
                    isEnabled: true,
                    username: 'username',
                    password: 'password',
                },
                app: {
                    integrationPointsTimeout: 1000,
                },
            })

            const response = {
                statusCode: HttpStatusCode.FORBIDDEN,
                body: { errorDescription: 'Resource is forbidden' },
                statusMessage: 'Resource is forbidden',
            }

            jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([
                null,
                { statusCode: response.statusCode, data: response.body, statusMessage: response.statusMessage },
            ])

            const eisUserApprovalVerificationService = new EisUserApprovalVerificationService(config, diiaLoggerMock, httpServiceMock)

            await expect(async () => {
                await eisUserApprovalVerificationService.verify(itn, headers)
            }).rejects.toEqual(new UnauthorizedError())
            expect(diiaLoggerMock.info).toHaveBeenCalledWith('Get approve from EIS: result', {
                statusCode: response.statusCode,
                statusMessage: response.statusMessage,
            })
        })
    })
})
