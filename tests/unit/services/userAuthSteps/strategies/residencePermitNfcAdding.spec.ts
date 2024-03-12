import { randomUUID } from 'crypto'

import { CryptoService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, DocumentTypeCamelCase } from '@diia-inhouse/types'

import AuthService from '@services/auth'
import DocumentsService from '@services/documents'
import NotificationService from '@services/notification'
import UserService from '@services/user'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import { ResidencePermitNfcAddingStrategyService } from '@services/userAuthSteps/strategies'

import userAuthSteps from '@models/userAuthSteps'

import { AuthMethod } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { GenderAsSex } from '@interfaces/services/authMethods'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { MessageTemplateCode } from '@interfaces/services/notification'
import { AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

describe('ResidencePermitNfcAddingStrategyService', () => {
    const testKit = new TestKit()
    const cryptoService = mockInstance(CryptoService)
    const logger = mockInstance(DiiaLogger)
    const authService = mockInstance(AuthService)
    const documentsService = mockInstance(DocumentsService)
    const notificationService = mockInstance(NotificationService)
    const userService = mockInstance(UserService)
    const processCodeDefinerService = new ProcessCodeDefinerService()
    const residencePermitNfcAddingStrategyService = new ResidencePermitNfcAddingStrategyService(
        cryptoService,
        logger,
        authService,
        documentsService,
        notificationService,
        userService,
    )
    const { user } = testKit.session.getUserSession()
    const { identifier } = user
    const headers = testKit.session.getHeaders()
    const requestId = randomUUID()
    const processId = randomUUID()

    describe('method: `verify`', () => {
        it.each([
            [
                'has document in registry',
                DocumentType.EResidency,
                DocumentTypeCamelCase.eResidency,
                (): void => {
                    jest.spyOn(documentsService, 'hasDocumentInRegistry').mockResolvedValueOnce(true)
                    jest.spyOn(notificationService, 'createNotificationWithPushesByMobileUidSafe').mockResolvedValueOnce()
                },
                (): void => {
                    expect(notificationService.createNotificationWithPushesByMobileUidSafe).toHaveBeenCalledWith({
                        userIdentifier: identifier,
                        mobileUid: headers.mobileUid,
                        templateCode: MessageTemplateCode.ResidencePermitTemporaryAdded,
                    })
                },
            ],
            [
                'has document in registry',
                DocumentType.ResidencePermitPermanent,
                DocumentTypeCamelCase.residencePermitPermanent,
                (): void => {
                    jest.spyOn(documentsService, 'hasDocumentInRegistry').mockResolvedValueOnce(true)
                    jest.spyOn(notificationService, 'createNotificationWithPushesByMobileUidSafe').mockResolvedValueOnce()
                },
                (): void => {
                    expect(notificationService.createNotificationWithPushesByMobileUidSafe).toHaveBeenCalledWith({
                        userIdentifier: identifier,
                        mobileUid: headers.mobileUid,
                        templateCode: MessageTemplateCode.ResidencePermitTemporaryAdded,
                    })
                },
            ],
            [
                'has no document in registry',
                DocumentType.EResidency,
                DocumentTypeCamelCase.eResidency,
                (): void => {
                    jest.spyOn(documentsService, 'hasDocumentInRegistry').mockResolvedValueOnce(false)
                    jest.spyOn(notificationService, 'createNotificationWithPushesByMobileUidSafe').mockResolvedValueOnce()
                },
                (): void => {
                    expect(notificationService.createNotificationWithPushesByMobileUidSafe).toHaveBeenCalledWith({
                        userIdentifier: identifier,
                        mobileUid: headers.mobileUid,
                        templateCode: MessageTemplateCode.ResidencePermitTemporaryNotFound,
                    })
                },
            ],
            [
                'has no document in registry',
                DocumentType.ResidencePermitPermanent,
                DocumentTypeCamelCase.residencePermitPermanent,
                (): void => {
                    jest.spyOn(documentsService, 'hasDocumentInRegistry').mockResolvedValueOnce(false)
                    jest.spyOn(notificationService, 'createNotificationWithPushesByMobileUidSafe').mockResolvedValueOnce()
                },
                (): void => {
                    expect(notificationService.createNotificationWithPushesByMobileUidSafe).toHaveBeenCalledWith({
                        userIdentifier: identifier,
                        mobileUid: headers.mobileUid,
                        templateCode: MessageTemplateCode.ResidencePermitPermanentNotFound,
                    })
                },
            ],
        ])(
            `should successfully verify ${AuthMethod.Nfc} auth method when %s and document type is %s`,
            async (
                _msg: string,
                documentType: DocumentType,
                documentTypeCamelCase: DocumentTypeCamelCase,
                initCaseSpecificStubs: CallableFunction,
                checkCaseSpecificExpectations: CallableFunction,
            ) => {
                const nfcUserDto: NfcUserDTO = {
                    birthDay: user.birthDay,
                    docNumber: 'doc-number',
                    docType: documentTypeCamelCase,
                    firstName: user.fName,
                    gender: GenderAsSex.M,
                    itn: user.itn,
                    lastName: user.lName,
                    middleName: user.mName,
                    recordNumber: 'record-number',
                }
                const method: AuthMethod = AuthMethod.Nfc
                const hashData = 'hash-data'
                const encryptedData = 'encrypted-data'
                const options: AuthStrategyVerifyOptions = {
                    method,
                    authMethodParams: {
                        headers,
                    },
                    headers,
                    user,
                    authSteps: new userAuthSteps({ processId }),
                    requestId,
                }

                jest.spyOn(authService, 'verify').mockResolvedValueOnce(nfcUserDto)
                jest.spyOn(cryptoService, 'encryptData').mockResolvedValueOnce({ hashData, encryptedData })
                jest.spyOn(userService, 'addDocumentInStorage').mockResolvedValueOnce()
                jest.spyOn(documentsService, 'expireDocument').mockResolvedValueOnce()
                initCaseSpecificStubs()

                expect(await residencePermitNfcAddingStrategyService.verify(options)).toEqual([])
                expect(authService.verify).toHaveBeenCalledWith(method, '', { headers, user })
                expect(cryptoService.encryptData).toHaveBeenCalledWith({ id: nfcUserDto.docNumber })
                expect(userService.addDocumentInStorage).toHaveBeenCalledWith(identifier, documentType, hashData, encryptedData)
                expect(documentsService.expireDocument).toHaveBeenCalledWith(user, documentType)
                expect(documentsService.hasDocumentInRegistry).toHaveBeenCalledWith(documentType, user)
                checkCaseSpecificExpectations()
            },
        )

        it('should fail with bad request error in case user was not provided', async () => {
            const method: AuthMethod = AuthMethod.Nfc
            const options: AuthStrategyVerifyOptions = {
                authMethodParams: {
                    headers,
                },
                authSteps: new userAuthSteps({ processId }),
                headers,
                method,
                requestId,
            }

            await expect(async () => {
                await residencePermitNfcAddingStrategyService.verify(options)
            }).rejects.toEqual(new BadRequestError('User is not provided'))
        })

        it('should fail with unhandled auth method error', async () => {
            const unhandledMethod: AuthMethod = AuthMethod.Qes
            const nfcUserDto: NfcUserDTO = {
                birthDay: user.birthDay,
                docNumber: 'doc-number',
                docType: DocumentTypeCamelCase.eResidency,
                firstName: user.fName,
                gender: GenderAsSex.M,
                itn: user.itn,
                lastName: user.lName,
                middleName: user.mName,
                recordNumber: 'record-number',
            }
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

            jest.spyOn(authService, 'verify').mockResolvedValueOnce(nfcUserDto)

            await expect(async () => {
                await residencePermitNfcAddingStrategyService.verify(options)
            }).rejects.toEqual(new TypeError(`Unhandled residence permit adding method: ${unhandledMethod}`))
            expect(authService.verify).toHaveBeenCalledWith(unhandledMethod, '', { headers, user })
        })
    })

    describe('property: `authStepsStatusToAuthMethodProcessCode`', () => {
        it.each([[ProcessCode.ResidencePermitAddedSuccessfully, UserAuthStepsStatus.Success, <UserAuthStep>{ method: AuthMethod.Nfc }]])(
            'should return %s process code in case step status is %s and step is %s',
            (expectedProcessCode: ProcessCode, inputStatus: UserAuthStepsStatus, inputStep: UserAuthStep) => {
                expect(
                    processCodeDefinerService.getProcessCodeOnVerify(
                        inputStatus,
                        inputStep,
                        residencePermitNfcAddingStrategyService.authStepsStatusToAuthMethodProcessCode,
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
                <UserAuthStep>{ method: AuthMethod.Nfc },
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
                        residencePermitNfcAddingStrategyService.authStepsStatusToAuthMethodProcessCode,
                    )
                }).toThrow(expectedError)
            },
        )
    })
})
