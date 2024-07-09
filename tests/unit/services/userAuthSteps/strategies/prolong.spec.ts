import { randomUUID } from 'node:crypto'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import UserService from '@services/user'
import AuthDataService from '@services/userAuthSteps/authData'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { ProlongStrategyService } from '@services/userAuthSteps/strategies'
import UserAuthTokenService from '@services/userAuthToken'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod, AuthSchemaCode, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { DocumentType } from '@interfaces/services/documents'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('ProlongStrategyService', () => {
    const logger = mockInstance(DiiaLogger)
    const userService = mockInstance(UserService)
    const testKit = new TestKit()
    const authDataService = mockInstance(AuthDataService)
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const prolongStrategyService = new ProlongStrategyService(logger, userService, authDataService, userAuthTokenService)
    const { user } = testKit.session.getUserSession()
    const { identifier } = user
    const headers = testKit.session.getHeaders()
    const requestId = randomUUID()
    const processId = randomUUID()

    describe('method: `verify`', () => {
        it.each([
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
                (): void => {
                    jest.spyOn(userService, 'hasOneOfDocuments').mockResolvedValueOnce(false)
                },
                (): void => {
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: false,
                        code: AuthSchemaCode.Prolong,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers,
                            method: AuthMethod.BankId,
                            bankId: 'bankId',
                            requestId,
                            sessionType: SessionType.User,
                            user,
                        },
                    })
                    expect(userService.hasOneOfDocuments).toHaveBeenCalledWith(identifier, [
                        DocumentType.InternalPassport,
                        DocumentType.ForeignPassport,
                    ])
                },
                [],
            ],
            [
                AuthMethod.Monobank,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                        bankId: 'monobank',
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.Monobank,
                    requestId,
                    user,
                },
                (): void => {
                    jest.spyOn(userService, 'hasOneOfDocuments').mockResolvedValueOnce(false)
                },
                (): void => {
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: false,
                        code: AuthSchemaCode.Prolong,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers,
                            method: AuthMethod.Monobank,
                            bankId: 'monobank',
                            requestId,
                            sessionType: SessionType.User,
                            user,
                        },
                    })
                    expect(userService.hasOneOfDocuments).toHaveBeenCalledWith(identifier, [
                        DocumentType.InternalPassport,
                        DocumentType.ForeignPassport,
                    ])
                },
                [],
            ],
            [
                AuthMethod.PrivatBank,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                        bankId: 'privatbank',
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.PrivatBank,
                    requestId,
                    user,
                },
                (): void => {
                    jest.spyOn(userService, 'hasOneOfDocuments').mockResolvedValueOnce(true)
                },
                (): void => {
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: false,
                        code: AuthSchemaCode.Prolong,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers,
                            method: AuthMethod.PrivatBank,
                            bankId: 'privatbank',
                            requestId,
                            sessionType: SessionType.User,
                            user,
                        },
                    })
                    expect(userService.hasOneOfDocuments).toHaveBeenCalledWith(identifier, [
                        DocumentType.InternalPassport,
                        DocumentType.ForeignPassport,
                    ])
                },
                [AuthSchemaCondition.HasDocumentPhoto],
            ],
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
                (): void => {
                    jest.spyOn(userService, 'hasOneOfDocuments').mockResolvedValueOnce(true)
                },
                (): void => {
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: false,
                        code: AuthSchemaCode.Prolong,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers,
                            method: AuthMethod.Nfc,
                            requestId,
                            sessionType: SessionType.User,
                            user,
                        },
                    })
                },
                [],
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
                (): void => {},
                (): void => {},
                [],
            ],
        ])(
            'should successfully verify %s auth method',
            async (
                method: AuthMethod,
                options: AuthStrategyVerifyOptions,
                initStubs: CallableFunction,
                checkTestCaseExpectations: CallableFunction,
                expectedResult,
            ) => {
                const {
                    authMethodParams: { bankId },
                } = options

                jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)
                jest.spyOn(authDataService, 'saveAuthorizationData').mockResolvedValueOnce()
                initStubs()

                expect(await prolongStrategyService.verify(options)).toEqual(expectedResult)
                expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers, bankId })
                checkTestCaseExpectations()
            },
        )

        it('should fail with bad request error in case user was not provided', async () => {
            const method: AuthMethod = AuthMethod.BankId
            const options: AuthStrategyVerifyOptions = {
                authMethodParams: {
                    headers,
                    bankId: 'bankId',
                },
                authSteps: new userAuthSteps({ processId }),
                headers,
                method,
                requestId,
            }

            await expect(async () => {
                await prolongStrategyService.verify(options)
            }).rejects.toEqual(new BadRequestError('User is not provided'))
        })

        it('should fail with access denied error in case new itn is not matching', async () => {
            const newItn = randomUUID()
            const method: AuthMethod = AuthMethod.BankId
            const options: AuthStrategyVerifyOptions = {
                authMethodParams: {
                    headers,
                    bankId: 'bankId',
                },
                authSteps: new userAuthSteps({ processId }),
                headers,
                method,
                requestId,
                user: { ...user, itn: newItn },
            }
            const {
                authMethodParams: { bankId },
            } = options
            const saveAuthorizationDataSpy = jest.spyOn(authDataService, 'saveAuthorizationData')

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)
            saveAuthorizationDataSpy.mockReset()
            saveAuthorizationDataSpy.mockResolvedValueOnce()

            await expect(async () => {
                await prolongStrategyService.verify(options)
            }).rejects.toEqual(new AccessDeniedError())
            expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers, bankId })
            expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                attachUserIdentifier: false,
                code: AuthSchemaCode.Prolong,
                processId,
                userIdentifier: identifier,
                tokenParams: {
                    headers,
                    method,
                    requestId,
                    bankId: 'bankId',
                    sessionType: SessionType.User,
                    user,
                },
            })
            expect(logger.error).toHaveBeenCalledWith('Itn does not match')
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

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)

            await expect(async () => {
                await prolongStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled auth method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        it.each([
            [ProcessCode.SchemaProlongSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.BankId }],
            [
                ProcessCode.SchemaProlongStepSuccess,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.BankId, endDate: new Date() },
            ],
            [
                ProcessCode.SchemaProlongStepSuccess,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Monobank, endDate: new Date() },
            ],
            [
                ProcessCode.SchemaProlongStepSuccess,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.PrivatBank, endDate: new Date() },
            ],
        ])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        prolongStrategyService.authStepsStatusToAuthMethodProcessCode,
                    ),
                ).toEqual(expectedProcessCode)
            },
        )

        it.each([
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.PhotoId },
                new TypeError(`Unhandled method: ${AuthMethod.PhotoId}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Nfc },
                new TypeError(`Unhandled method: ${AuthMethod.Nfc}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Qes },
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
                        prolongStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
