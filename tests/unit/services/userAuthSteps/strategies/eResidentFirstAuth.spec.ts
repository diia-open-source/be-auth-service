import { randomUUID } from 'crypto'

import { IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { EnvService } from '@diia-inhouse/env'
import { UnauthorizedError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { IdentifierPrefix, SessionType } from '@diia-inhouse/types'

import AuthService from '@services/auth'
import EResidentFirstAuthService from '@services/eResidentFirstAuth'
import AuthDataService from '@services/userAuthSteps/authData'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { EResidentFirstAuthStrategyService } from '@services/userAuthSteps/strategies'
import UserAuthTokenService from '@services/userAuthToken'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('EResidentFirstAuthStrategyService', () => {
    const logger = mockInstance(DiiaLogger)
    const identifierService = mockInstance(IdentifierService)
    const envService = mockInstance(EnvService)
    const authService = mockInstance(AuthService)
    const testKit = new TestKit()
    const authDataService = mockInstance(AuthDataService)
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const eResidentFirstAuthService = mockInstance(EResidentFirstAuthService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const eResidentFirstAuthStrategyService = new EResidentFirstAuthStrategyService(
        identifierService,
        logger,
        envService,
        authService,
        authDataService,
        userAuthTokenService,
        eResidentFirstAuthService,
    )
    const { user } = testKit.session.getUserSession()
    const { identifier } = user
    const headers = testKit.session.getHeaders()
    const requestId = randomUUID()
    const processId = randomUUID()

    describe('method: `verify`', () => {
        it(`should successfully verify ${AuthMethod.EResidentQrCode} auth method`, async () => {
            const method: AuthMethod = AuthMethod.EResidentQrCode
            const options: AuthStrategyVerifyOptions = {
                authMethodParams: {
                    headers,
                    qrCodePayload: {
                        token: 'token',
                    },
                },
                authSteps: new userAuthSteps({ processId }),
                headers,
                method,
                requestId,
                user,
            }
            const {
                authMethodParams: { bankId, qrCodePayload },
                authSteps,
            } = options
            const { itn } = user

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)
            jest.spyOn(identifierService, 'createIdentifier').mockReturnValueOnce(identifier)
            jest.spyOn(authDataService, 'saveAuthorizationData').mockResolvedValueOnce()
            jest.spyOn(eResidentFirstAuthService, 'saveQrCodeTokenInCache').mockResolvedValueOnce()
            jest.spyOn(authSteps, 'save').mockResolvedValueOnce(authSteps)

            expect(await eResidentFirstAuthStrategyService.verify(options)).toEqual([])
            expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({
                method,
                requestId,
                headers,
                bankId,
                qrCodePayload,
            })
            expect(identifierService.createIdentifier).toHaveBeenCalledWith(itn, { prefix: IdentifierPrefix.EResident })
            expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                attachUserIdentifier: false,
                code: AuthSchemaCode.EResidentFirstAuth,
                processId,
                userIdentifier: identifier,
                tokenParams: {
                    headers,
                    method,
                    bankId,
                    requestId,
                    sessionType: SessionType.EResident,
                    user,
                },
            })
            expect(eResidentFirstAuthService.saveQrCodeTokenInCache).toHaveBeenCalledWith(
                AuthSchemaCode.EResidentFirstAuth,
                headers.mobileUid,
                qrCodePayload,
            )
            expect(authSteps.save).toHaveBeenCalledWith()
        })

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

            expect(await eResidentFirstAuthStrategyService.verify(options)).toEqual([])
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
                await eResidentFirstAuthStrategyService.verify(options)
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
                await eResidentFirstAuthStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled auth method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        it.each([
            [ProcessCode.EResidentQrCodeSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.EResidentQrCode }],
            [ProcessCode.EResidentPhotoIdSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.PhotoId }],
            [ProcessCode.EResidentQrCodeSuccess, UserAuthStepsStatus.Processing, <UserAuthStep>{ method: AuthMethod.EResidentQrCode }],
            [ProcessCode.EResidentPhotoIdSuccess, UserAuthStepsStatus.Processing, <UserAuthStep>{ method: AuthMethod.PhotoId }],
            [ProcessCode.EResidentQrCodeFail, UserAuthStepsStatus.Failure, <UserAuthStep>{ method: AuthMethod.EResidentQrCode }],
            [ProcessCode.EResidentPhotoIdFail, UserAuthStepsStatus.Failure, <UserAuthStep>{ method: AuthMethod.PhotoId }],
        ])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        eResidentFirstAuthStrategyService.authStepsStatusToAuthMethodProcessCode,
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
                        eResidentFirstAuthStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
