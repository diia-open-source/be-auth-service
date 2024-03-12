import { randomUUID } from 'crypto'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { HttpError, InternalServerError, ServiceUnavailableError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpService } from '@diia-inhouse/http'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import PrivatBankProvider from '@services/authMethods/privatBank'

import { AppConfig } from '@interfaces/config'
import { GenderAsSex } from '@interfaces/services/authMethods'
import { PrivatBankUserDTO } from '@interfaces/services/authMethods/privatBank'

describe('PrivatBankProvider', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const httpServiceMock = mockInstance(HttpService)

    const config = <AppConfig>{
        app: {
            integrationPointsTimeout: 30000,
        },
        thirdParty: {
            privatbank: {
                account: 'account',
                baseUrl: 'privatbank.ua/auth',
                secret: 'secret',
                version: 'v1',
            },
        },
    }

    const privatBankProvider = new PrivatBankProvider(config, loggerMock, httpServiceMock)

    describe('method: requestAuthorizationUrl', () => {
        const {
            app: { integrationPointsTimeout },
            thirdParty: {
                privatbank: { baseUrl },
            },
        } = config

        const authPayload = { cmd: 'create_sid' }

        it('should successfully initiate privatbank authentication and return auth url', async () => {
            const sid = randomUUID()

            jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: { sid } }])

            expect(await privatBankProvider.requestAuthorizationUrl()).toBe(`https://www.privat24.ua/rd/send_qr/diia_auth/${sid}`)

            expect(loggerMock.info).toHaveBeenCalledWith('Requesting Privatbank Authorization Url', {
                authPayload,
                path: expect.any(String),
            })
            expect(httpServiceMock.post).toHaveBeenCalledWith(
                {
                    path: expect.any(String),
                    host: baseUrl,
                    rejectUnauthorized: false,
                    timeout: integrationPointsTimeout,
                },
                undefined,
                JSON.stringify(authPayload),
            )
            expect(loggerMock.info).toHaveBeenCalledWith('Privatbank Authorization Url received successfully')
            expect(loggerMock.debug).toHaveBeenCalledWith('Privatbank Authorization Url', { sid })
        })

        it.each([
            [
                'PrivatBank request auth url fail and data is present in error',
                new UnauthorizedError('Unknown client'),
                (): void => {
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([<Error>(<unknown>{ data: 'Unknown client' }), undefined])
                },
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('PrivatBank request auth url fail', { err: { data: 'Unknown client' } })
                },
            ],
            [
                'PrivatBank request auth url fail and data is not present in error',
                new UnauthorizedError(),
                (): void => {
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([<Error>(<unknown>{ message: 'Unknown client' }), undefined])
                },
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('PrivatBank request auth url fail', {
                        err: { message: 'Unknown client' },
                    })
                },
            ],
            [
                'PrivatBank request auth url returned error in response',
                new InternalServerError(),
                (): void => {
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: { result: 'error' } }])
                },
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith(
                        'PrivatBank request auth url fail. Please check the correctness of Resource URI',
                        { result: 'error' },
                    )
                },
            ],
        ])(
            'should fail with error in case %s',
            async (_msg: string, expectedError: Error, defineSpies: CallableFunction, checkExpectations: CallableFunction) => {
                defineSpies()

                await expect(async () => {
                    await privatBankProvider.requestAuthorizationUrl()
                }).rejects.toEqual(expectedError)

                expect(loggerMock.info).toHaveBeenCalledWith('Requesting Privatbank Authorization Url', {
                    authPayload,
                    path: expect.any(String),
                })
                expect(httpServiceMock.post).toHaveBeenCalledWith(
                    {
                        path: expect.any(String),
                        host: baseUrl,
                        rejectUnauthorized: false,
                        timeout: integrationPointsTimeout,
                    },
                    undefined,
                    JSON.stringify(authPayload),
                )

                checkExpectations()
            },
        )
    })

    describe('method: verify', () => {
        const requestId = randomUUID()
        const authPayload = { cmd: 'get_user_data', sid: requestId }
        const {
            app: { integrationPointsTimeout },
            thirdParty: {
                privatbank: { baseUrl },
            },
        } = config

        it('should successfully verify and return privatbank user data transfer object', async () => {
            const { user } = testKit.session.getUserSession()
            const privatBankUserDto: PrivatBankUserDTO = {
                birthday: user.birthDay,
                email: user.email,
                fio: `${user.lName} ${user.fName} ${user.mName}`,
                inn: user.itn,
                name: user.fName,
                surname: user.lName,
                patronymic: user.mName,
                phone: user.phoneNumber,
                passport: user.passport,
                sex: GenderAsSex.F,
                address: user.addressOfRegistration,
                birthplace: user.addressOfBirth,
            }

            jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: { userData: privatBankUserDto } }])

            expect(await privatBankProvider.verify(requestId)).toEqual(privatBankUserDto)

            expect(loggerMock.info).toHaveBeenCalledWith('Privatbank Auth: start')
            expect(loggerMock.info).toHaveBeenCalledWith('Requesting Privatbank user data', {
                authPayload,
                path: expect.any(String),
            })
            expect(httpServiceMock.post).toHaveBeenCalledWith(
                {
                    path: expect.any(String),
                    host: baseUrl,
                    rejectUnauthorized: false,
                    timeout: integrationPointsTimeout,
                },
                undefined,
                JSON.stringify(authPayload),
            )
            expect(loggerMock.info).toHaveBeenCalledWith('Privatbank Auth: success')
            expect(loggerMock.debug).toHaveBeenCalledWith('Privatbank auth result', privatBankUserDto)
        })

        it.each([
            [
                'PrivatBank user auth fail with details in data',
                new HttpError('Bad Request', HttpStatusCode.BAD_REQUEST),
                (): void => {
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([
                        <Error>(<unknown>{ statusCode: HttpStatusCode.BAD_REQUEST, data: 'Bad Request' }),
                        undefined,
                    ])
                },
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('PrivatBank user auth fail', {
                        error: 'Bad Request',
                    })
                },
            ],
            [
                'PrivatBank user auth fail without details in data',
                new ServiceUnavailableError(),
                (): void => {
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([new Error('Service unavailable'), undefined])
                },
                (): void => {},
            ],
            [
                'PrivatBank user auth returned error in response result',
                new UnauthorizedError(),
                (): void => {
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: { result: 'error' } }])
                },
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('PrivatBank user auth fail', { result: 'error' })
                },
            ],
        ])(
            'should fail with error in case %s',
            async (_mgs: string, expectedError: Error, defineSpies: CallableFunction, checkExpectations: CallableFunction) => {
                defineSpies()

                await expect(async () => {
                    await privatBankProvider.verify(requestId)
                }).rejects.toEqual(expectedError)

                checkExpectations()
                expect(loggerMock.info).toHaveBeenCalledWith('Privatbank Auth: start')
                expect(loggerMock.info).toHaveBeenCalledWith('Requesting Privatbank user data', {
                    authPayload,
                    path: expect.any(String),
                })
                expect(httpServiceMock.post).toHaveBeenCalledWith(
                    {
                        path: expect.any(String),
                        host: baseUrl,
                        rejectUnauthorized: false,
                        timeout: integrationPointsTimeout,
                    },
                    undefined,
                    JSON.stringify(authPayload),
                )
            },
        )
    })
})
