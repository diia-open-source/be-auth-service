import { randomUUID } from 'crypto'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { EnvService } from '@diia-inhouse/env'
import { UnauthorizedError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import AuthService from '@services/auth'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { EResidentDiiaIdCreationStrategyService } from '@services/userAuthSteps/strategies'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('EResidentDiiaIdCreationStrategyService', () => {
    const logger = mockInstance(DiiaLogger)
    const envService = mockInstance(EnvService)
    const authService = mockInstance(AuthService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const testKit = new TestKit()
    const eResidentDiiaIdCreationStrategyService = new EResidentDiiaIdCreationStrategyService(logger, envService, authService)
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

            expect(await eResidentDiiaIdCreationStrategyService.verify(options)).toEqual([])
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
            const expectedError = new Error()

            jest.spyOn(envService, 'isProd').mockReturnValueOnce(true)
            jest.spyOn(authService, 'verify').mockRejectedValue(expectedError)

            await expect(async () => {
                await eResidentDiiaIdCreationStrategyService.verify(options)
            }).rejects.toEqual(new UnauthorizedError('Photo Identification is not successful', ProcessCode.EResidentPhotoIdFail))
            expect(envService.isProd).toHaveBeenCalledWith()
            expect(authService.verify).toHaveBeenCalledWith(method, requestId, { headers })
            expect(logger.error).toHaveBeenCalledWith('PhotoId verification error', { err: expectedError })
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
                await eResidentDiiaIdCreationStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled auth method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        it.each([
            [ProcessCode.EResidentDiiaIdPhotoIdSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.PhotoId }],
            [ProcessCode.EResidentDiiaIdPhotoIdSuccess, UserAuthStepsStatus.Processing, <UserAuthStep>{ method: AuthMethod.PhotoId }],
        ])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        eResidentDiiaIdCreationStrategyService.authStepsStatusToAuthMethodProcessCode,
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
                new TypeError(`Unhandled method: ${AuthMethod.BankId}`),
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
                        eResidentDiiaIdCreationStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
