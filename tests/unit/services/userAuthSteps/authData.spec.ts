import { randomUUID } from 'crypto'

const userAuthStepsModelMock = {
    updateOne: jest.fn(),
    modelName: 'userAuthSteps',
}

jest.mock('@models/userAuthSteps', () => userAuthStepsModelMock)

import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, ModelNotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import AuthDataService from '@services/userAuthSteps/authData'

import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { AuthorizationDataParams } from '@interfaces/services/userAuthSteps'
import { GetUserTokenParams } from '@interfaces/services/userAuthToken'

describe('AuthDataService', () => {
    const testKit = new TestKit()
    const config = {
        auth: {
            schema: {
                schemaMap: {
                    [AuthSchemaCode.Authorization]: {
                        tokenParamsCacheTtl: 180000,
                    },
                    [AuthSchemaCode.CabinetAuthorization]: {
                        tokenParamsCacheTtl: 600000,
                    },
                },
            },
        },
    }
    const cacheService = mockInstance(CacheService)
    const logger = mockInstance(DiiaLogger)
    const authDataService = new AuthDataService(<AppConfig>(<unknown>config), cacheService, logger)

    describe('method: getAuthorizationCacheData', () => {
        const code = AuthSchemaCode.Authorization
        const processId = randomUUID()
        const requestId = randomUUID()
        const method = AuthMethod.BankId
        const headers = testKit.session.getHeaders()
        const sessionType = SessionType.User

        it('should successfully return authorization data from cache', async () => {
            const cachedData: GetUserTokenParams = {
                headers,
                method,
                requestId,
                sessionType,
            }

            jest.spyOn(cacheService, 'get').mockResolvedValueOnce(JSON.stringify(cachedData))

            expect(await authDataService.getAuthorizationCacheData(code, processId)).toEqual(cachedData)

            expect(cacheService.get).toHaveBeenCalledWith(`user-auth-steps-${code}-${processId}`)
        })

        it.each([
            [
                'data in cache not found or authorization process expired',
                new AccessDeniedError(),
                (): void => {
                    jest.spyOn(cacheService, 'get').mockResolvedValueOnce(null)
                },
                (): void => {
                    expect(logger.error).toHaveBeenCalledWith('Failed to get authorization cache data', {
                        err: new AccessDeniedError(),
                        processId,
                    })
                },
            ],
        ])(
            'should fail with error in case %s',
            async (_msg: string, expectedError: Error, defineSpies: CallableFunction, checkExpectations: CallableFunction) => {
                defineSpies()

                await expect(async () => {
                    await authDataService.getAuthorizationCacheData(code, processId)
                }).rejects.toEqual(expectedError)

                expect(cacheService.get).toHaveBeenCalledWith(`user-auth-steps-${code}-${processId}`)
                checkExpectations()
            },
        )
    })

    describe(`method: ${authDataService.saveAuthorizationData.name}`, () => {
        const processId = randomUUID()
        const requestId = randomUUID()
        const userIdentifier = 'user-dentifier'
        const headers = testKit.session.getHeaders()

        it.each([
            [
                'ttl is present in configuration for specific auth code',
                <AuthorizationDataParams>{
                    attachUserIdentifier: true,
                    code: AuthSchemaCode.Authorization,
                    processId,
                    userIdentifier,
                    tokenParams: {
                        headers,
                        method: AuthMethod.BankId,
                        requestId,
                        sessionType: SessionType.User,
                        bankId: 'bankId',
                    },
                },
                180,
                (): void => {
                    userAuthStepsModelMock.updateOne.mockResolvedValueOnce({ modifiedCount: 1 })
                },
                (): void => {
                    expect(userAuthStepsModelMock.updateOne).toHaveBeenCalledWith({ processId }, { userIdentifier })
                },
            ],
            [
                'custom ttl',
                <AuthorizationDataParams>{
                    attachUserIdentifier: true,
                    code: AuthSchemaCode.CabinetAuthorization,
                    processId,
                    userIdentifier,
                    tokenParams: {
                        headers,
                        method: AuthMethod.Ds,
                        requestId,
                        sessionType: SessionType.CabinetUser,
                    },
                },
                600,
                (): void => {
                    userAuthStepsModelMock.updateOne.mockResolvedValueOnce({ modifiedCount: 1 })
                },
                (): void => {
                    expect(userAuthStepsModelMock.updateOne).toHaveBeenCalledWith({ processId }, { userIdentifier })
                },
            ],
            [
                'default ttl',
                <AuthorizationDataParams>{
                    attachUserIdentifier: true,
                    code: AuthSchemaCode.EResidentApplicantAuth,
                    processId,
                    userIdentifier,
                    tokenParams: {
                        headers,
                        method: AuthMethod.EmailOtp,
                        requestId,
                        sessionType: SessionType.EResidentApplicant,
                    },
                },
                180,
                (): void => {
                    userAuthStepsModelMock.updateOne.mockResolvedValueOnce({ modifiedCount: 1 })
                },
                (): void => {
                    expect(userAuthStepsModelMock.updateOne).toHaveBeenCalledWith({ processId }, { userIdentifier })
                },
            ],
        ])(
            'should successfully save authrization data when %s',
            async (
                _msg: string,
                params: AuthorizationDataParams,
                expectedTtl: number,
                defineSpies: CallableFunction,
                checkExpectations: CallableFunction,
            ) => {
                const { code, tokenParams } = params

                jest.spyOn(cacheService, 'set').mockResolvedValueOnce('OK')
                defineSpies()

                expect(await authDataService.saveAuthorizationData(params)).toBeUndefined()
                expect(cacheService.set).toHaveBeenCalledWith(
                    `user-auth-steps-${code}-${processId}`,
                    JSON.stringify(tokenParams),
                    expectedTtl,
                )
                checkExpectations()
            },
        )

        it('should fail with error in case unable to update user auth steps', async () => {
            const params: AuthorizationDataParams = {
                attachUserIdentifier: true,
                code: AuthSchemaCode.Authorization,
                processId,
                userIdentifier,
                tokenParams: {
                    headers,
                    method: AuthMethod.BankId,
                    requestId,
                    sessionType: SessionType.User,
                    bankId: 'bankId',
                },
            }
            const { code, tokenParams } = params

            jest.spyOn(cacheService, 'set').mockResolvedValueOnce('OK')
            userAuthStepsModelMock.updateOne.mockResolvedValueOnce({ modifiedCount: 0 })

            await expect(async () => {
                await authDataService.saveAuthorizationData(params)
            }).rejects.toEqual(new ModelNotFoundError(userAuthStepsModelMock.modelName, processId))
            expect(cacheService.set).toHaveBeenCalledWith(`user-auth-steps-${code}-${processId}`, JSON.stringify(tokenParams), 180)
            expect(userAuthStepsModelMock.updateOne).toHaveBeenCalledWith({ processId }, { userIdentifier })
        })
    })
})
