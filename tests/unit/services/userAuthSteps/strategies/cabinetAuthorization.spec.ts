const uuidv5 = jest.fn()

jest.mock('uuid', () => {
    const original = jest.requireActual('uuid')

    return {
        ...original,
        v5: uuidv5,
    }
})

import { randomUUID } from 'node:crypto'

import { IdentifierService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import AuthDataService from '@services/userAuthSteps/authData'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { CabinetAuthorizationStrategyService } from '@services/userAuthSteps/strategies'
import UserAuthTokenService from '@services/userAuthToken'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('CabinetAuthorizationStrategyService', () => {
    const identifierService = mockInstance(IdentifierService)
    const testKit = new TestKit()
    const authDataService = mockInstance(AuthDataService)
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const cabinetAuthorizationStrategyService = new CabinetAuthorizationStrategyService(
        identifierService,
        authDataService,
        userAuthTokenService,
    )
    const { user } = testKit.session.getUserSession()
    const { identifier, itn } = user
    const headers = testKit.session.getHeaders()
    const requestId = randomUUID()
    const processId = randomUUID()
    const deviceUuid = randomUUID()

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
                    uuidv5.mockReturnValueOnce(deviceUuid)
                },
                (): void => {
                    expect(uuidv5).toHaveBeenCalledWith(itn, headers.mobileUid)
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: true,
                        code: AuthSchemaCode.CabinetAuthorization,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers: { ...headers, mobileUid: deviceUuid },
                            method: AuthMethod.BankId,
                            bankId: 'bankId',
                            requestId,
                            sessionType: SessionType.CabinetUser,
                            user,
                        },
                    })
                },
            ],
            [
                AuthMethod.Ds,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                        qesPayload: { signature: 'signature' },
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.Ds,
                    requestId,
                    user,
                },
                (): void => {
                    uuidv5.mockReturnValueOnce(deviceUuid)
                },
                (): void => {
                    expect(uuidv5).toHaveBeenCalledWith(itn, headers.mobileUid)
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: true,
                        code: AuthSchemaCode.CabinetAuthorization,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers: { ...headers, mobileUid: deviceUuid },
                            method: AuthMethod.Ds,
                            requestId,
                            sessionType: SessionType.CabinetUser,
                            user,
                        },
                    })
                },
            ],
            [
                AuthMethod.Qes,
                <AuthStrategyVerifyOptions>{
                    authMethodParams: {
                        headers,
                        qesPayload: { signature: 'signature' },
                    },
                    authSteps: new userAuthSteps({ processId }),
                    headers,
                    method: AuthMethod.Qes,
                    requestId,
                    user,
                },
                (): void => {
                    uuidv5.mockReturnValueOnce(deviceUuid)
                },
                (): void => {
                    expect(uuidv5).toHaveBeenCalledWith(itn, headers.mobileUid)
                    expect(authDataService.saveAuthorizationData).toHaveBeenCalledWith({
                        attachUserIdentifier: true,
                        code: AuthSchemaCode.CabinetAuthorization,
                        processId,
                        userIdentifier: identifier,
                        tokenParams: {
                            headers: { ...headers, mobileUid: deviceUuid },
                            method: AuthMethod.Qes,
                            requestId,
                            sessionType: SessionType.CabinetUser,
                            user,
                        },
                    })
                },
            ],
        ])(
            'should successfully verify %s auth method',
            async (
                method: AuthMethod,
                options: AuthStrategyVerifyOptions,
                defineStubs: CallableFunction,
                checkTestCaseExpectations: CallableFunction,
            ) => {
                const {
                    authMethodParams: { bankId, qesPayload },
                } = options

                defineStubs()
                jest.spyOn(userAuthTokenService, 'prepareUserData').mockResolvedValueOnce(user)
                jest.spyOn(identifierService, 'createIdentifier').mockReturnValueOnce(identifier)

                expect(await cabinetAuthorizationStrategyService.verify(options)).toEqual([])
                expect(userAuthTokenService.prepareUserData).toHaveBeenCalledWith({
                    method,
                    requestId,
                    headers,
                    bankId,
                    qesPayload,
                })
                expect(identifierService.createIdentifier).toHaveBeenCalledWith(itn)
                checkTestCaseExpectations()
            },
        )

        it('should fail with unhandled auth method error', async () => {
            const unhandledMethod: AuthMethod = AuthMethod.Nfc
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
                await cabinetAuthorizationStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled auth method: ${unhandledMethod}`))
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        it.each([
            [ProcessCode.AuthQesSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Ds }],
            [ProcessCode.AuthQesSuccess, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Qes }],
            [ProcessCode.AuthBankSuccessWithoutPhoto, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.BankId }],
        ])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        cabinetAuthorizationStrategyService.authStepsStatusToAuthMethodProcessCode,
                    ),
                ).toEqual(expectedProcessCode)
            },
        )

        it.each([
            [
                UserAuthStepsStatus.Success,
                <UserAuthStep>{ method: AuthMethod.PhotoId },
                new TypeError(`Unhandled method: ${AuthMethod.PhotoId}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.PhotoId },
                new TypeError(`Unhandled status: ${UserAuthStepsStatus.Processing}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.BankId },
                new TypeError(`Unhandled status: ${UserAuthStepsStatus.Processing}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Ds },
                new TypeError(`Unhandled status: ${UserAuthStepsStatus.Processing}`),
            ],
            [
                UserAuthStepsStatus.Processing,
                <UserAuthStep>{ method: AuthMethod.Qes },
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
                        cabinetAuthorizationStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
