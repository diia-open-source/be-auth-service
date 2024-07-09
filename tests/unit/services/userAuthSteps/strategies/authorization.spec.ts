import { randomUUID } from 'node:crypto'

import { IdentifierService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import AuthDataService from '@services/userAuthSteps/authData'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { AuthorizationStrategyService } from '@services/userAuthSteps/strategies'
import UserAuthTokenService from '@services/userAuthToken'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('AuthorizationStrategyService', () => {
    const identifierService = mockInstance(IdentifierService)
    const testKit = new TestKit()
    const authDataService = mockInstance(AuthDataService)
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const authorizationStrategyService = new AuthorizationStrategyService(identifierService, authDataService, userAuthTokenService)
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
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: true,
                        code: AuthSchemaCode.Authorization,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers,
                            method: AuthMethod.BankId,
                            requestId,
                            sessionType: SessionType.User,
                            bankId: 'bankId',
                            user,
                        },
                    })
                },
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
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: true,
                        code: AuthSchemaCode.Authorization,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers,
                            method: AuthMethod.Monobank,
                            requestId,
                            sessionType: SessionType.User,
                            bankId: 'monobank',
                            user,
                        },
                    })
                },
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
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: true,
                        code: AuthSchemaCode.Authorization,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers,
                            method: AuthMethod.PrivatBank,
                            requestId,
                            sessionType: SessionType.User,
                            bankId: 'privatbank',
                            user,
                        },
                    })
                },
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
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: true,
                        code: AuthSchemaCode.Authorization,
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
            ],
        ])(
            'should successfully verify %s auth method',
            async (method: AuthMethod, options: AuthStrategyVerifyOptions, checkTestCaseExpectations: CallableFunction) => {
                const {
                    authMethodParams: { bankId },
                } = options
                const { itn } = user

                jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)
                jest.spyOn(identifierService, 'createIdentifier').mockReturnValueOnce(identifier)

                expect(await authorizationStrategyService.verify(options)).toEqual([])
                expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({ method, requestId, headers, bankId })
                expect(identifierService.createIdentifier).toHaveBeenCalledWith(itn)
                checkTestCaseExpectations()
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

            jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)
            jest.spyOn(identifierService, 'createIdentifier').mockReturnValueOnce(identifier)

            await expect(async () => {
                await authorizationStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled auth method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        it.each([
            [ProcessCode.AuthBankSuccessWithoutPhoto, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.BankId }],
            [ProcessCode.AuthBankSuccessWithoutPhoto, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Monobank }],
            [ProcessCode.AuthBankSuccessWithoutPhoto, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.PrivatBank }],
            [ProcessCode.AuthBankPhotoIdSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.PhotoId }],
            [ProcessCode.AuthNfcSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Nfc }],
            [
                ProcessCode.AuthBankSuccessWithPhoto,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.BankId, endDate: new Date() },
            ],
            [
                ProcessCode.AuthBankSuccessWithPhoto,
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Monobank, endDate: new Date() },
            ],
            [
                ProcessCode.AuthBankSuccessWithPhoto,
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
                        authorizationStrategyService.authStepsStatusToAuthMethodProcessCode,
                    ),
                ).toEqual(expectedProcessCode)
            },
        )

        it.each([
            [UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Qes }, new TypeError(`Unhandled method: ${AuthMethod.Qes}`)],
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
                        authorizationStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
