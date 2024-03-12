import { randomUUID } from 'crypto'

import { IdentifierService } from '@diia-inhouse/crypto'
import { AccessDeniedError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { IdentifierPrefix, SessionType } from '@diia-inhouse/types'

import AuthService from '@services/auth'
import AuthDataService from '@services/userAuthSteps/authData'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { EResidentApplicantAuthStrategyService } from '@services/userAuthSteps/strategies'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('EResidentApplicantAuthStrategyService', () => {
    const identifierService = mockInstance(IdentifierService)
    const testKit = new TestKit()
    const authService = mockInstance(AuthService)
    const authDataService = mockInstance(AuthDataService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const eResidentApplicantAuthStrategyService = new EResidentApplicantAuthStrategyService(identifierService, authService, authDataService)
    const { user } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()
    const requestId = randomUUID()
    const processId = randomUUID()

    describe('method: `verify`', () => {
        it(`should successfully verify ${AuthMethod.EmailOtp} auth method`, async () => {
            const method: AuthMethod = AuthMethod.EmailOtp
            const options: AuthStrategyVerifyOptions = {
                authMethodParams: {
                    headers,
                    otp: '1234',
                },
                authSteps: new userAuthSteps({ processId }),
                headers,
                method,
                requestId,
            }
            const { identifier, email } = user

            jest.spyOn(authService, 'verify').mockResolvedValueOnce(user)
            jest.spyOn(identifierService, 'createIdentifier').mockReturnValueOnce(identifier)
            jest.spyOn(authDataService, 'saveAuthorizationData').mockResolvedValueOnce()

            expect(await eResidentApplicantAuthStrategyService.verify(options)).toEqual([])
            expect(authService.verify).toHaveBeenCalledWith(method, requestId, {
                headers,
                otp: options.authMethodParams.otp,
            })
            expect(identifierService.createIdentifier).toHaveBeenCalledWith(email, { prefix: IdentifierPrefix.EResidentApplicant })
            expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                attachUserIdentifier: true,
                code: AuthSchemaCode.EResidentApplicantAuth,
                processId,
                userIdentifier: identifier,
                tokenParams: {
                    headers,
                    method,
                    requestId,
                    sessionType: SessionType.EResidentApplicant,
                    user,
                },
            })
        })

        it(`should fail to verify ${AuthMethod.EmailOtp} auth method`, async () => {
            const method: AuthMethod = AuthMethod.EmailOtp
            const options: AuthStrategyVerifyOptions = {
                authMethodParams: {
                    headers,
                    otp: '1234',
                },
                authSteps: new userAuthSteps({ processId }),
                headers,
                method,
                requestId,
            }

            jest.spyOn(authService, 'verify').mockRejectedValueOnce(new Error())

            await expect(async () => {
                await eResidentApplicantAuthStrategyService.verify(options)
            }).rejects.toEqual(
                new AccessDeniedError(
                    'Verification failed. Reason: Otp is invalid or expired',
                    {},
                    ProcessCode.EResidentApplicantAuthOtpFail,
                ),
            )
            expect(authService.verify).toHaveBeenCalledWith(method, requestId, {
                headers,
                otp: options.authMethodParams.otp,
            })
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
                await eResidentApplicantAuthStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled auth method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        it.each([
            [ProcessCode.EResidentApplicantOtpSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.EmailOtp }],
            [ProcessCode.EResidentApplicantOtpSuccess, UserAuthStepsStatus.Processing, <UserAuthStep>{ method: AuthMethod.EmailOtp }],
            [ProcessCode.EResidentApplicantAuthOtpFail, UserAuthStepsStatus.Failure, <UserAuthStep>{ method: AuthMethod.EmailOtp }],
        ])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        eResidentApplicantAuthStrategyService.authStepsStatusToAuthMethodProcessCode,
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
                new TypeError(`Unhandled method: ${AuthMethod.BankId}`),
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
                        eResidentApplicantAuthStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
