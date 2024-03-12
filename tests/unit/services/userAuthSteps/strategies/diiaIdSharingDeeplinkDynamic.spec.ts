import { randomUUID } from 'crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'

import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { DiiaIdSharingDeeplinkDynamicStrategyService } from '@services/userAuthSteps/strategies'
import UserAuthTokenService from '@services/userAuthToken'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('DiiaIdSharingDeeplinkDynamicStrategyService', () => {
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
                const {
                    authMethodParams: { bankId },
                } = options
                const diiaIdSharingDeeplinkDynamicStrategyService = new DiiaIdSharingDeeplinkDynamicStrategyService(userAuthTokenService)

                jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

                await expect(async () => {
                    await diiaIdSharingDeeplinkDynamicStrategyService.verify(options)
                }).rejects.toEqual(new Error(`Unexpected auth method: ${method}`))
                expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers, bankId })
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
            const diiaIdSharingDeeplinkDynamicStrategyService = new DiiaIdSharingDeeplinkDynamicStrategyService(userAuthTokenService)

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

            expect(await diiaIdSharingDeeplinkDynamicStrategyService.verify(options)).toEqual([])
            expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers, bankId: undefined })
        })

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
            const diiaIdSharingDeeplinkDynamicStrategyService = new DiiaIdSharingDeeplinkDynamicStrategyService(userAuthTokenService)

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

            await expect(async () => {
                await diiaIdSharingDeeplinkDynamicStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled auth method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        const diiaIdSharingDeeplinkDynamicStrategyService = new DiiaIdSharingDeeplinkDynamicStrategyService(userAuthTokenService)

        it.each([
            [ProcessCode.UserPhotoIdAuthSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.PhotoId }],
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
                        diiaIdSharingDeeplinkDynamicStrategyService.authStepsStatusToAuthMethodProcessCode,
                    ),
                ).toEqual(expectedProcessCode)
            },
        )

        it.each([
            [UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Qes }, new TypeError(`Unhandled method: ${AuthMethod.Qes}`)],
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
            [UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Nfc }, new TypeError(`Unhandled method: ${AuthMethod.Nfc}`)],
            [
                UserAuthStepsStatus.Success,
                <UserAuthStep>{ method: AuthMethod.PrivatBank },
                new TypeError(`Unhandled method: ${AuthMethod.PrivatBank}`),
            ],
            [
                UserAuthStepsStatus.Success,
                <UserAuthStep>{ method: AuthMethod.Qes, endDate: new Date() },
                new TypeError(`Unhandled method: ${AuthMethod.Qes}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.BankId, endDate: new Date() },
                new TypeError(`Unhandled method: ${AuthMethod.BankId}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Monobank, endDate: new Date() },
                new TypeError(`Unhandled method: ${AuthMethod.Monobank}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.PrivatBank, endDate: new Date() },
                new TypeError(`Unhandled method: ${AuthMethod.PrivatBank}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Nfc, endDate: new Date() },
                new TypeError(`Unhandled method: ${AuthMethod.Nfc}`),
            ],
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
                        diiaIdSharingDeeplinkDynamicStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
