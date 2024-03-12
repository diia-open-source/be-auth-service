import { randomUUID } from 'crypto'

const Endpoint = {
    PERSONAL_AUTH_REQUEST: '/auth',
    CLIENT_INFO: '/client/info',
}
const signerStubs = {
    sign: jest.fn(),
}

class SignerMock {
    sign(...args: unknown[]): unknown {
        return signerStubs.sign(...args)
    }
}

jest.mock('monobank-api-client/src/Endpoint', () => Endpoint)
jest.mock('monobank-api-client/src/Signer', () => SignerMock)

import DiiaLogger from '@diia-inhouse/diia-logger'
import { BadRequestError, HttpError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpService } from '@diia-inhouse/http'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import MonobankProvider from '@services/authMethods/monobank'

import { AppConfig } from '@interfaces/config'
import { GenderAsPerson } from '@interfaces/services/authMethods'
import { MonobankUserDTO } from '@interfaces/services/authMethods/monobank'

describe('MonobankProvider', () => {
    const now = new Date()
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const httpServiceMock = mockInstance(HttpService)

    const config = <AppConfig>{
        app: {
            integrationPointsTimeout: 30000,
        },
        thirdParty: {
            monobank: {
                APIToken: 'api-secret-token',
                baseUrl: 'monobank.ua/auth',
                isEnabled: true,
                pathToPrivateKey: 'secrets/monobank/private.key',
            },
        },
    }
    const signature = 'signature'
    const time = Math.floor(now.getTime() / 1000).toString()

    beforeAll(() => {
        jest.useFakeTimers({ now })
    })

    afterAll(() => {
        jest.useRealTimers()
    })

    describe('method: requestAuthorizationUrl', () => {
        const acceptUrl = `https://monobank.ua/auth/url`

        it('should successfully initiate monobank authorization flow and return auth url', async () => {
            const {
                thirdParty: {
                    monobank: { baseUrl, APIToken },
                },
                app: { integrationPointsTimeout },
            } = config

            const monobankProvider = new MonobankProvider(config, loggerMock, httpServiceMock)

            jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: { acceptUrl } }])
            signerStubs.sign.mockReturnValueOnce(signature)

            expect(await monobankProvider.requestAuthorizationUrl()).toBe(acceptUrl)

            expect(httpServiceMock.post).toHaveBeenCalledWith({
                host: baseUrl,
                path: Endpoint.PERSONAL_AUTH_REQUEST,
                headers: {
                    'X-Key-Id': APIToken,
                    'X-Time': time,
                    'X-Permissions': '',
                    'X-Sign': signature,
                },
                rejectUnauthorized: false,
                timeout: integrationPointsTimeout,
            })
            expect(signerStubs.sign).toHaveBeenCalledWith(`${time}${Endpoint.PERSONAL_AUTH_REQUEST}`)
            expect(loggerMock.debug).toHaveBeenCalledWith('Request Authorization Url', { acceptUrl })
            expect(loggerMock.info).toHaveBeenCalledWith('Monobank provider init')
        })

        it.each([
            [
                'monobank provider is disabled',
                new Error('Monobank provider is disabled'),
                <AppConfig>{ ...config, thirdParty: { monobank: { isEnabled: false } } },
                (): void => {},
                (): void => {
                    expect(loggerMock.info).toHaveBeenCalledWith('Monobank provider disabled')
                },
            ],
            [
                'monobank request auth url fail',
                new HttpError('Unable to initiate auth', 500),
                config,
                (): void => {
                    signerStubs.sign.mockReturnValueOnce(signature)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([new Error('Unable to initiate auth'), undefined])
                },
                (): void => {
                    const {
                        thirdParty: {
                            monobank: { baseUrl, APIToken },
                        },
                        app: { integrationPointsTimeout },
                    } = config

                    expect(httpServiceMock.post).toHaveBeenCalledWith({
                        host: baseUrl,
                        path: Endpoint.PERSONAL_AUTH_REQUEST,
                        headers: {
                            'X-Key-Id': APIToken,
                            'X-Time': time,
                            'X-Permissions': '',
                            'X-Sign': signature,
                        },
                        rejectUnauthorized: false,
                        timeout: integrationPointsTimeout,
                    })
                    expect(signerStubs.sign).toHaveBeenCalledWith(`${time}${Endpoint.PERSONAL_AUTH_REQUEST}`)
                    expect(loggerMock.error).toHaveBeenCalledWith('Monobank request auth url fail', {
                        error: expect.any(String),
                        err: expect.any(Error),
                    })
                    expect(loggerMock.info).toHaveBeenCalledWith('Monobank provider init')
                },
            ],
        ])(
            'should fail with error in case %s',
            async (
                _msg: string,
                expectedError: Error,
                inputConfig: AppConfig,
                defineSpies: CallableFunction,
                checkExpectations: CallableFunction,
            ) => {
                const monobankProvider = new MonobankProvider(inputConfig, loggerMock, httpServiceMock)

                defineSpies()

                await expect(async () => {
                    await monobankProvider.requestAuthorizationUrl()
                }).rejects.toEqual(expectedError)

                checkExpectations()
            },
        )
    })

    describe('method: verify', () => {
        const requestId = randomUUID()
        const {
            app: { integrationPointsTimeout },
            thirdParty: {
                monobank: { baseUrl, APIToken },
            },
        } = config

        it('should successfully verify and return monobank user data transfer object', async () => {
            const { user } = testKit.session.getUserSession()
            const monobankUserDto = <MonobankUserDTO>{
                birthDay: user.birthDay,
                email: user.email,
                fName: user.fName,
                gender: GenderAsPerson.Woman,
                inn: user.itn,
                lName: user.lName,
                mName: user.mName,
                phoneNumber: user.phoneNumber,
                passportNumber: user.passport,
            }

            const monobankProvider = new MonobankProvider(config, loggerMock, httpServiceMock)

            jest.spyOn(httpServiceMock, 'get').mockResolvedValueOnce([null, { data: monobankUserDto }])
            signerStubs.sign.mockReturnValueOnce(signature)

            expect(await monobankProvider.verify(requestId)).toEqual(monobankUserDto)

            expect(loggerMock.info).toHaveBeenCalledWith('Monobank Auth: start')
            expect(signerStubs.sign).toHaveBeenCalledWith(`${time}${requestId}${Endpoint.CLIENT_INFO}`)
            expect(httpServiceMock.get).toHaveBeenCalledWith({
                host: baseUrl,
                path: Endpoint.CLIENT_INFO,
                headers: {
                    'X-Key-Id': APIToken,
                    'X-Time': time,
                    'X-Sign': signature,
                    'X-Request-Id': requestId,
                },
                rejectUnauthorized: false,
                timeout: integrationPointsTimeout,
            })
            expect(loggerMock.debug).toHaveBeenCalledWith('Monobank auth result', monobankUserDto)
            expect(loggerMock.info).toHaveBeenCalledWith('Monobank Auth: success')
        })

        it.each([
            [
                'monobank provider returned not found error status code',
                new UnauthorizedError('Requested user not found'),
                (): void => {
                    jest.spyOn(httpServiceMock, 'get').mockResolvedValueOnce([
                        <Error>(<unknown>{ statusCode: HttpStatusCode.NOT_FOUND, data: { errorDescription: 'Requested user not found' } }),
                        undefined,
                    ])
                },
            ],
            [
                'monobank provider returned unauthorized error status code',
                new UnauthorizedError('Requested user is not unauthorized'),
                (): void => {
                    jest.spyOn(httpServiceMock, 'get').mockResolvedValueOnce([<Error>(<unknown>{
                            statusCode: HttpStatusCode.UNAUTHORIZED,
                            data: { errorDescription: 'Requested user is not unauthorized' },
                        }), undefined])
                },
            ],
            [
                'monobank provider returned unhandled error status code',
                new UnauthorizedError(
                    `${JSON.stringify({ errorDescription: 'Service temporarily unavailable' })} ${HttpStatusCode.SERVICE_UNAVAILABLE}`,
                ),
                (): void => {
                    jest.spyOn(httpServiceMock, 'get').mockResolvedValueOnce([<Error>(<unknown>{
                            statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
                            data: { errorDescription: 'Service temporarily unavailable' },
                        }), undefined])
                },
            ],
            [
                'monobank provider has thrown error without data and status code',
                new BadRequestError('Monobank Auth failed', { err: new Error('Unable to connect') }),
                (): void => {
                    jest.spyOn(httpServiceMock, 'get').mockResolvedValueOnce([new Error('Unable to connect'), undefined])
                },
            ],
        ])('should fail with error in case %s', async (_msg: string, expectedError: Error, defineSpies: CallableFunction) => {
            const monobankProvider = new MonobankProvider(config, loggerMock, httpServiceMock)

            signerStubs.sign.mockReturnValueOnce(signature)
            defineSpies()

            await expect(async () => {
                await monobankProvider.verify(requestId)
            }).rejects.toEqual(expectedError)

            expect(loggerMock.info).toHaveBeenCalledWith('Monobank Auth: start')
            expect(signerStubs.sign).toHaveBeenCalledWith(`${time}${requestId}${Endpoint.CLIENT_INFO}`)
            expect(httpServiceMock.get).toHaveBeenCalledWith({
                host: baseUrl,
                path: Endpoint.CLIENT_INFO,
                headers: {
                    'X-Key-Id': APIToken,
                    'X-Time': time,
                    'X-Sign': signature,
                    'X-Request-Id': requestId,
                },
                rejectUnauthorized: false,
                timeout: integrationPointsTimeout,
            })
        })
    })
})
