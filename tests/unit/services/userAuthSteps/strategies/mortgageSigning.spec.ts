import { randomUUID } from 'node:crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'

import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { MortgageSigningStrategyService } from '@services/userAuthSteps/strategies'
import UserAuthTokenService from '@services/userAuthToken'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('MortgageSigningStrategyService', () => {
    const testKit = new TestKit()
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const { user } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()
    const requestId = randomUUID()
    const processId = randomUUID()

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
            'should fail to verify %s auth method in case it is unexpected',
            async (method: AuthMethod, options: AuthStrategyVerifyOptions) => {
                const mortgageSigningStrategyService = new MortgageSigningStrategyService(userAuthTokenService)

                jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

                await expect(async () => {
                    await mortgageSigningStrategyService.verify(options)
                }).rejects.toEqual(new Error(`Unexpected method: ${method}`))
                expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers })
            },
        )

        it(`should successfully verify ${AuthMethod.PhotoId} auth method`, async () => {
            const method: AuthMethod = AuthMethod.PhotoId
            const options: AuthStrategyVerifyOptions = {
                authMethodParams: {
                    headers,
                },
                authSteps: new userAuthSteps({ processId }),
                headers,
                method,
                requestId,
                user,
            }
            const mortgageSigningStrategyService = new MortgageSigningStrategyService(userAuthTokenService)

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

            expect(await mortgageSigningStrategyService.verify(options)).toEqual([])
            expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers })
        })

        it('should fail with unhandled method error', async () => {
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
            const mortgageSigningStrategyService = new MortgageSigningStrategyService(userAuthTokenService)

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

            await expect(async () => {
                await mortgageSigningStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled method: ${unhandledMethod}`))
            expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method: unhandledMethod, requestId, headers })
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        const mortgageSigningStrategyService = new MortgageSigningStrategyService(userAuthTokenService)

        it.each([[ProcessCode.DiiaIdSigningPhotoIdSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.PhotoId }]])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        mortgageSigningStrategyService.authStepsStatusToAuthMethodProcessCode,
                    ),
                ).toEqual(expectedProcessCode)
            },
        )

        it.each([
            [
                UserAuthStepsStatus.Success,
                <UserAuthStep>{ method: AuthMethod.BankId },
                new TypeError(`Unhandled method: ${AuthMethod.BankId}`),
            ],
            [
                UserAuthStepsStatus.Success,
                <UserAuthStep>{ method: AuthMethod.Monobank },
                new TypeError(`Unhandled method: ${AuthMethod.Monobank}`),
            ],
            [
                UserAuthStepsStatus.Success,
                <UserAuthStep>{ method: AuthMethod.PrivatBank },
                new TypeError(`Unhandled method: ${AuthMethod.PrivatBank}`),
            ],
            [UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Nfc }, new TypeError(`Unhandled method: ${AuthMethod.Nfc}`)],
            [UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Qes }, new TypeError(`Unhandled method: ${AuthMethod.Qes}`)],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.BankId },
                new TypeError(`Unhandled status: ${UserAuthStepsStatus.Processing}`),
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
                        mortgageSigningStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
