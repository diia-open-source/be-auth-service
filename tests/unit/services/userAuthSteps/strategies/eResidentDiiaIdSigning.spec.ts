import { randomUUID } from 'node:crypto'

import { EnvService } from '@diia-inhouse/env'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import AuthService from '@services/auth'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { EResidentDiiaIdSigningStrategyService } from '@services/userAuthSteps/strategies'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('EResidentDiiaIdSigningStrategyService', () => {
    const envService = mockInstance(EnvService)
    const authService = mockInstance(AuthService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const testKit = new TestKit()
    const eResidentDiiaIdSigningStrategyService = new EResidentDiiaIdSigningStrategyService(authService, envService)
    const { user } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()
    const requestId = randomUUID()
    const processId = randomUUID()

    describe('method: `verify`', () => {
        it(`shoudl successfully verify ${AuthMethod.PhotoId} auth method`, async () => {
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

            jest.spyOn(envService, 'isProd').mockReturnValueOnce(true)
            jest.spyOn(authService, 'verify').mockResolvedValueOnce()

            expect(await eResidentDiiaIdSigningStrategyService.verify(options)).toEqual([])
            expect(envService.isProd).toHaveBeenCalledWith()
            expect(authService.verify).toHaveBeenCalledWith(method, requestId, { headers })
        })

        it(`shoudl fail to verify ${AuthMethod.PhotoId} auth method`, async () => {
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
            const expectedError = new Error('Test error')

            jest.spyOn(envService, 'isProd').mockReturnValueOnce(true)
            jest.spyOn(authService, 'verify').mockRejectedValue(expectedError)

            await expect(async () => {
                await eResidentDiiaIdSigningStrategyService.verify(options)
            }).rejects.toEqual(expectedError)
            expect(envService.isProd).toHaveBeenCalledWith()
            expect(authService.verify).toHaveBeenCalledWith(method, requestId, { headers })
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

            await expect(async () => {
                await eResidentDiiaIdSigningStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        it.each([[ProcessCode.DiiaIdSigningPhotoIdSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.PhotoId }]])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        eResidentDiiaIdSigningStrategyService.authStepsStatusToAuthMethodProcessCode,
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
                        eResidentDiiaIdSigningStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
