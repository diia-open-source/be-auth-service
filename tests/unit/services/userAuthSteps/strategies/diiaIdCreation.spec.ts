import { randomUUID } from 'node:crypto'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { EnvService } from '@diia-inhouse/env'
import { AccessDeniedError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { DiiaIdCreationStrategyService } from '@services/userAuthSteps/strategies'
import UserAuthTokenService from '@services/userAuthToken'

import userAuthSteps from '@models/userAuthSteps'

import { AppConfig } from '@interfaces/config'
import { AuthMethod } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('DiiaIdCreationStrategyService', () => {
    const logger = mockInstance(DiiaLogger)
    const testKit = new TestKit()
    const envService = mockInstance(EnvService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const { user } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()
    const requestId = randomUUID()
    const processId = randomUUID()
    const config = <AppConfig>{
        authService: {
            schema: {
                comparingItnIsEnabled: true,
            },
        },
    }

    describe('method: `verify`', () => {
        it.each([
            [
                AuthMethod.Nfc,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.Nfc,
                    requestId,
                    user,
                },
            ],
            [
                AuthMethod.BankId,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                        bankId: 'bankId',
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.BankId,
                    requestId,
                    user,
                },
            ],
            [
                AuthMethod.Monobank,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.Monobank,
                    requestId,
                    user,
                },
            ],
            [
                AuthMethod.PrivatBank,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.PrivatBank,
                    requestId,
                    user,
                },
            ],
            [
                AuthMethod.PhotoId,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.PhotoId,
                    requestId,
                    user,
                },
            ],
        ])('should successfully verify %s auth method', async (method: AuthMethod, options: AuthStrategyVerifyOptions) => {
            const {
                authMethodParams: { bankId },
            } = options
            const diiaIdCreationStrategyService = new DiiaIdCreationStrategyService(config, logger, envService, userAuthTokenService)

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

            expect(await diiaIdCreationStrategyService.verify(options)).toEqual([])
            expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers, bankId })
        })

        it.each([
            [
                AuthMethod.Nfc,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.Nfc,
                    requestId,
                    user: { ...user, itn: randomUUID() },
                },
            ],
            [
                AuthMethod.BankId,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                        bankId: 'bankId',
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.BankId,
                    requestId,
                    user: { ...user, itn: randomUUID() },
                },
            ],
            [
                AuthMethod.Monobank,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.Monobank,
                    requestId,
                    user: { ...user, itn: randomUUID() },
                },
            ],
            [
                AuthMethod.PrivatBank,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.PrivatBank,
                    requestId,
                    user: { ...user, itn: randomUUID() },
                },
            ],
        ])(
            'should fail to verify %s auth method in case itn check is enabled and itn is invalid',
            async (method: AuthMethod, options: AuthStrategyVerifyOptions) => {
                const {
                    authMethodParams: { bankId },
                } = options
                const diiaIdCreationStrategyService = new DiiaIdCreationStrategyService(
                    {
                        ...config,
                        authService: { ...config.authService, schema: { ...config.authService.schema, comparingItnIsEnabled: false } },
                    },
                    logger,
                    envService,
                    userAuthTokenService,
                )

                jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)
                jest.spyOn(envService, 'isProd').mockReturnValueOnce(true)

                await expect(async () => {
                    await diiaIdCreationStrategyService.verify(options)
                }).rejects.toEqual(new AccessDeniedError())
                expect(envService.isProd).toHaveBeenCalledWith()
                expect(logger.error).toHaveBeenCalledWith('Itn has not matched', { processId })
                expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers, bankId })
            },
        )

        it('should fail with unhandled auth method error', async () => {
            const unhandledMethod: AuthMethod = AuthMethod.Qes
            const options: AuthStrategyVerifyOptions = {
                authMethodParams: {
                    headers,
                },
                authSteps: new userAuthSteps({ processId }),
                headers,
                method: unhandledMethod,
                requestId,
                user,
            }
            const diiaIdCreationStrategyService = new DiiaIdCreationStrategyService(config, logger, envService, userAuthTokenService)

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

            await expect(async () => {
                await diiaIdCreationStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled auth method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        const diiaIdCreationStrategyService = new DiiaIdCreationStrategyService(config, logger, envService, userAuthTokenService)

        it.each([
            [ProcessCode.DiiaIdCreationUserBankingAuthSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.BankId }],
            [ProcessCode.DiiaIdCreationUserBankingAuthSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Monobank }],
            [
                ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
                UserAuthStepsStatus.Success,
                <UserAuthStep>{ method: AuthMethod.PrivatBank },
            ],
            [ProcessCode.UserPhotoIdAuthSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.PhotoId }],
            [ProcessCode.UserBankindNfcAuthSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Nfc }],
            [
                ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.BankId, endDate: new Date() },
            ],
            [
                ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Monobank, endDate: new Date() },
            ],
            [
                ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.PrivatBank, endDate: new Date() },
            ],
            [
                ProcessCode.UserBankindNfcAuthSuccess,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Nfc, endDate: new Date() },
            ],
            [
                ProcessCode.UserPhotoIdAuthSuccess,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.PhotoId, endDate: new Date() },
            ],
        ])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        diiaIdCreationStrategyService.authStepsStatusToAuthMethodProcessCode,
                    ),
                ).toEqual(expectedProcessCode)
            },
        )

        it.each([
            [UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Qes }, new TypeError(`Unhandled method: ${AuthMethod.Qes}`)],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Qes, endDate: new Date() },
                new TypeError(`Unhandled method: ${AuthMethod.Qes}`),
            ],
            [
                UserAuthStepsStatus.Failure,
                <UserAuthStep>{ method: AuthMethod.BankId },
                new TypeError(`Unhandled status: ${UserAuthStepsStatus.Failure}`),
            ],
            [
                UserAuthStepsStatus.Completed,
                <UserAuthStep>{ method: AuthMethod.BankId },
                new TypeError(`Unhandled status: ${UserAuthStepsStatus.Completed}`),
            ],
            [
                <UserAuthStepsStatus>'unhandled-status',
                <UserAuthStep>{ method: AuthMethod.BankId },
                new TypeError('Unhandled status: unhandled-status'),
            ],
        ])(
            'should throw error in case step status is %s and step is %s',
            (inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep, expectedError: Error) => {
                expect(() => {
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        diiaIdCreationStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
