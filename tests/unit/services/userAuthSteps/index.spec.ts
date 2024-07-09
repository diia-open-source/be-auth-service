import { randomUUID } from 'node:crypto'

const uuidV4Stub = jest.fn()
const diiaUtilsMock = {
    handleError: jest.fn(),
}

jest.mock('uuid', () => ({ v4: uuidV4Stub }))
jest.mock('@diia-inhouse/utils', () => ({ utils: diiaUtilsMock }))

import { UpdateWriteOpResult } from '@diia-inhouse/db'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, ApiError, BadRequestError, InternalServerError, ModelNotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import AppUtils from '@src/utils'

import AuthSchemaService from '@services/authSchema'
import DocumentsService from '@services/documents'
import PublicService from '@services/public'
import UserService from '@services/user'
import UserAuthStepsService from '@services/userAuthSteps'
import ProcessCodeDefinerService from '@services/userAuthSteps/processCodeDefiner'
import {
    AuthorizationStrategyService,
    CabinetAuthorizationStrategyService,
    DiiaIdCreationStrategyService,
    DiiaIdSharingBarcodeStrategyService,
    DiiaIdSharingDeeplinkDynamicStrategyService,
    DiiaIdSharingDeeplinkStaticStrategyService,
    DiiaIdSigningStrategyService,
    EResidentApplicantAuthStrategyService,
    EResidentAuthStrategyService,
    EResidentDiiaIdCreationStrategyService,
    EResidentDiiaIdSigningStrategyService,
    EResidentFirstAuthStrategyService,
    MilitaryBondsSigningStrategyService,
    MortgageSigningStrategyService,
    ProlongStrategyService,
    ResidencePermitNfcAddingStrategyService,
} from '@services/userAuthSteps/strategies'

import authSchemaModel from '@models/authSchema'
import userAuthStepsModel from '@models/userAuthSteps'

import UserAuthStepsDataMapper from '@dataMappers/userAuthStepsDataMapper'

import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchema, AuthSchemaCode, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStepsModel, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { DocumentType } from '@interfaces/services/documents'
import { AuthMethodsResponse } from '@interfaces/services/userAuthSteps'

const composeAuthSchema = (code: AuthSchemaCode, methods: AuthMethod[]): AuthSchema => ({
    code,
    title: 'Please authorize in the application.',
    methods,
    checks: [],
    admitAfter: [],
})

describe('UserAuthStepsService', () => {
    const now = new Date()
    const config = <AppConfig>(<unknown>{
        authService: {
            schema: {
                admissionStepsTtl: 18000,
            },
        },
    })
    const testKit = new TestKit()
    const logger = mockInstance(DiiaLogger)
    const appUtils = mockInstance(AppUtils)
    const authSchemaService = mockInstance(AuthSchemaService)
    const documentsService = mockInstance(DocumentsService)
    const publicService = mockInstance(PublicService)
    const userService = mockInstance(UserService)
    const userAuthStepsDataMapper = mockInstance(UserAuthStepsDataMapper)
    const processCodeDefinerServiceMock = mockInstance(ProcessCodeDefinerService)
    const authorizationStrategyService = mockInstance(AuthorizationStrategyService)
    const cabinetAuthorizationStrategyService = mockInstance(CabinetAuthorizationStrategyService)
    const diiaIdCreationStrategyService = mockInstance(DiiaIdCreationStrategyService)
    const diiaIdSharingBarcodeStrategyService = mockInstance(DiiaIdSharingBarcodeStrategyService)
    const diiaIdSharingDeeplinkDynamicStrategyService = mockInstance(DiiaIdSharingDeeplinkDynamicStrategyService)
    const diiaIdSharingDeeplinkStaticStrategyService = mockInstance(DiiaIdSharingDeeplinkStaticStrategyService)
    const diiaIdSigningStrategyService = mockInstance(DiiaIdSigningStrategyService)
    const eResidentApplicantAuthStrategyService = mockInstance(EResidentApplicantAuthStrategyService)
    const eResidentAuthStrategyService = mockInstance(EResidentAuthStrategyService)
    const eResidentDiiaIdCreationStrategyService = mockInstance(EResidentDiiaIdCreationStrategyService)
    const eResidentDiiaIdSignStrategyService = mockInstance(EResidentDiiaIdSigningStrategyService)
    const eResidentFirstAuthStrategyService = mockInstance(EResidentFirstAuthStrategyService)
    const militaryBondsSigningStrategyService = mockInstance(MilitaryBondsSigningStrategyService)
    const mortgageSigningStrategyService = mockInstance(MortgageSigningStrategyService)
    const prolongStrategyService = <ProlongStrategyService>(<unknown>{
        isUserRequired: true,
        completeOnSuccess: true,
        verify: async (): Promise<AuthSchemaCondition[]> => [],
    })
    const residencePermitNfcAddingStrategyService = mockInstance(ResidencePermitNfcAddingStrategyService)
    const userAuthStepsService = new UserAuthStepsService(
        config,
        logger,
        appUtils,
        authSchemaService,
        documentsService,
        publicService,
        userService,
        userAuthStepsDataMapper,
        processCodeDefinerServiceMock,
        authorizationStrategyService,
        cabinetAuthorizationStrategyService,
        diiaIdCreationStrategyService,
        diiaIdSharingBarcodeStrategyService,
        diiaIdSharingDeeplinkDynamicStrategyService,
        diiaIdSharingDeeplinkStaticStrategyService,
        diiaIdSigningStrategyService,
        eResidentApplicantAuthStrategyService,
        eResidentAuthStrategyService,
        eResidentDiiaIdCreationStrategyService,
        eResidentDiiaIdSignStrategyService,
        eResidentFirstAuthStrategyService,
        militaryBondsSigningStrategyService,
        mortgageSigningStrategyService,
        prolongStrategyService,
        residencePermitNfcAddingStrategyService,
    )

    beforeEach(() => {
        jest.useFakeTimers({ now })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    describe('method: getAuthMethods', () => {
        const code = AuthSchemaCode.DiiaIdCreation
        const processId = randomUUID()
        const headers = testKit.session.getHeaders()
        const validAuthSchemaModel = new authSchemaModel({
            ...composeAuthSchema(code, [AuthMethod.BankId]),
            admitAfter: [{ code: AuthSchemaCode.Authorization }],
            [AuthMethod.BankId]: {
                maxAttempts: 3,
                maxVerifyAttempts: 1,
                ttl: 180000,
            },
        })
        const { user } = testKit.session.getUserSession()

        it('should successfully create new auth process and return auth methods in case processId is not provided', async () => {
            const { mobileUid } = headers
            const initialUserAuthSteps = {
                code,
                mobileUid,
                processId,
                status: UserAuthStepsStatus.Processing,
                statusHistory: [{ status: UserAuthStepsStatus.Processing, date: new Date() }],
                conditions: [],
                isRevoked: false,
            }
            const validAuthStepsModel = new userAuthStepsModel(initialUserAuthSteps)
            const expectedResult: AuthMethodsResponse = {
                processId,
                skipAuthMethods: false,
                authMethods: [AuthMethod.BankId],
            }

            jest.spyOn(userAuthStepsModel, 'updateMany').mockResolvedValueOnce(<UpdateWriteOpResult>{ modifiedCount: 1 })
            jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(validAuthSchemaModel)
            uuidV4Stub.mockReturnValueOnce(processId)
            jest.spyOn(userAuthStepsModel, 'create').mockResolvedValueOnce(<never>validAuthStepsModel)
            jest.spyOn(userAuthStepsDataMapper, 'toAuthMethodsResponse').mockReturnValueOnce(expectedResult)
            expect(await userAuthStepsService.getAuthMethods(code, headers, undefined, user)).toEqual(expectedResult)

            expect(userAuthStepsModel.updateMany).toHaveBeenCalledWith(
                { mobileUid, status: UserAuthStepsStatus.Processing },
                {
                    $set: { status: UserAuthStepsStatus.Failure },
                    $push: { statusHistory: { status: UserAuthStepsStatus.Failure, date: new Date() } },
                },
            )
            expect(logger.info).toHaveBeenCalledWith('Failed prev user auth schemas: 1')
            expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(userAuthStepsModel.create).toHaveBeenCalledWith({
                ...initialUserAuthSteps,
                userIdentifier: expect.any(String),
            })
            expect(userAuthStepsDataMapper.toAuthMethodsResponse).toHaveBeenCalledWith(
                validAuthSchemaModel,
                validAuthStepsModel,
                expectedResult.authMethods,
                undefined,
            )
        })

        it('should successfully use existing auth process and return auth methods in case processId is provided', async () => {
            const { mobileUid } = headers
            const validAuthStepsModel = new userAuthStepsModel({
                code,
                mobileUid,
                processId,
                status: UserAuthStepsStatus.Processing,
                statusHistory: [{ status: UserAuthStepsStatus.Processing, date: new Date() }],
                conditions: [],
                isRevoked: true,
            })
            const expectedResult: AuthMethodsResponse = {
                processId,
                skipAuthMethods: false,
                authMethods: [AuthMethod.BankId],
            }

            jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(validAuthSchemaModel)
            jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(validAuthStepsModel)
            jest.spyOn(userAuthStepsDataMapper, 'toAuthMethodsResponse').mockReturnValueOnce(expectedResult)

            expect(await userAuthStepsService.getAuthMethods(code, headers, processId, user)).toEqual(expectedResult)

            expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
            expect(userAuthStepsModel.findOne).toHaveBeenCalledWith({ processId, mobileUid, isRevoked: { $ne: true }, code })
            expect(userAuthStepsDataMapper.toAuthMethodsResponse).toHaveBeenCalledWith(
                validAuthSchemaModel,
                validAuthStepsModel,
                expectedResult.authMethods,
                undefined,
            )
        })

        it('should successfully use existing auth process and return auth methods in case processId is provided and admission steps not completed', async () => {
            const { mobileUid } = headers
            const validAuthStepsModel = new userAuthStepsModel({
                code,
                mobileUid,
                processId,
                status: UserAuthStepsStatus.Processing,
                statusHistory: [{ status: UserAuthStepsStatus.Processing, date: new Date() }],
                conditions: [],
                isRevoked: false,
                userIdentifier: 'user-identifier',
            })
            const expectedResult: AuthMethodsResponse = {
                processId,
                skipAuthMethods: false,
                authMethods: [AuthMethod.BankId],
            }

            jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(validAuthSchemaModel)
            jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(validAuthStepsModel)
            jest.spyOn(userAuthStepsModel, 'findOne').mockReturnValueOnce(<never>{ sort: () => false })
            jest.spyOn(userAuthStepsDataMapper, 'toAuthMethodsResponse').mockReturnValueOnce(expectedResult)

            expect(await userAuthStepsService.getAuthMethods(code, headers, processId, user)).toEqual(expectedResult)

            expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
            expect(userAuthStepsModel.findOne).toHaveBeenCalledWith({ processId, mobileUid, isRevoked: { $ne: true }, code })
            expect(userAuthStepsDataMapper.toAuthMethodsResponse).toHaveBeenCalledWith(
                validAuthSchemaModel,
                validAuthStepsModel,
                expectedResult.authMethods,
                undefined,
            )
        })

        it.each([
            [
                'methods list in schema is empty',
                new authSchemaModel({
                    ...composeAuthSchema(code, []),
                }),
                new userAuthStepsModel({
                    code,
                    mobileUid: headers.mobileUid,
                    processId,
                    status: UserAuthStepsStatus.Processing,
                    statusHistory: [{ status: UserAuthStepsStatus.Processing, date: new Date() }],
                    conditions: [],
                    isRevoked: false,
                    userIdentifier: user.identifier,
                }),
                (): void => {},
                (): void => {},
            ],
            [
                'admission steps are completed',
                new authSchemaModel({
                    ...composeAuthSchema(code, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                    admitAfter: [{ code: AuthSchemaCode.Authorization }],
                }),
                new userAuthStepsModel({
                    code,
                    mobileUid: headers.mobileUid,
                    processId,
                    status: UserAuthStepsStatus.Processing,
                    statusHistory: [{ status: UserAuthStepsStatus.Processing, date: new Date() }],
                    conditions: [],
                    isRevoked: false,
                    userIdentifier: 'user-identifier',
                }),
                (): void => {
                    jest.spyOn(userAuthStepsModel, 'findOne').mockReturnValueOnce(<never>{ sort: () => ({ processId: randomUUID() }) })
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(userAuthStepsModel.findOne).toHaveBeenCalledWith({
                        $or: [expect.any(Object)],
                        mobileUid,
                        userIdentifier: 'user-identifier',
                    })
                },
            ],
        ])('should skip auth methods in case %s', async (_msg, authSchema, authSteps, defineSpecificSpies, checkExpectations) => {
            const { mobileUid } = headers

            const expectedResult: AuthMethodsResponse = {
                processId,
                skipAuthMethods: true,
            }

            jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(authSchema)
            jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(authSteps)
            jest.spyOn(authSteps, 'save').mockResolvedValueOnce(authSteps)
            defineSpecificSpies()

            expect(await userAuthStepsService.getAuthMethods(code, headers, processId, user)).toEqual(expectedResult)

            expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
            expect(userAuthStepsModel.findOne).toHaveBeenCalledWith({ processId, mobileUid, isRevoked: { $ne: true }, code })
            expect(logger.info).toHaveBeenCalledWith('Skipping auth methods...', { processId })
            expect(logger.info).toHaveBeenCalledWith('Setting status for user auth steps', {
                processId: authSteps.processId,
                status: UserAuthStepsStatus.Success,
            })
            expect(authSteps.save).toHaveBeenCalledWith()
            checkExpectations()
        })

        it('should fail with error in case user is mandatory by auth strategy but is not provided', async () => {
            await expect(async () => {
                await userAuthStepsService.getAuthMethods(AuthSchemaCode.Prolong, headers, processId)
            }).rejects.toEqual(new BadRequestError('User is not provided'))
        })

        it('should fail with error in case unsupported schema code was provided', async () => {
            const unsupportedCode = <AuthSchemaCode>'unsupported-code'

            await expect(async () => {
                await userAuthStepsService.getAuthMethods(unsupportedCode, headers, processId)
            }).rejects.toEqual(new BadRequestError(`Unsupported schema code: ${unsupportedCode}`))
        })

        it.each([
            [
                'return auth methods with process code NoRequiredDocumentForDiiaId in case user has no identity documents',
                ProcessCode.NoRequiredDocumentForDiiaId,
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.DiiaIdCreation, [AuthMethod.PhotoId]),
                    checks: [ProcessCode.NoRequiredDocumentForDiiaId],
                    [AuthMethod.PhotoId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                new userAuthStepsModel({
                    code,
                    mobileUid: headers.mobileUid,
                    processId,
                    status: UserAuthStepsStatus.Processing,
                    steps: [],
                    conditions: [],
                    isRevoked: false,
                    userIdentifier: user.identifier,
                }),
                (): void => {
                    jest.spyOn(userService, 'hasOneOfDocuments').mockResolvedValueOnce(false)
                },
                (): void => {
                    expect(userService.hasOneOfDocuments).toHaveBeenCalledWith(user.identifier, [
                        DocumentType.InternalPassport,
                        DocumentType.ForeignPassport,
                        DocumentType.ResidencePermitPermanent,
                        DocumentType.ResidencePermitTemporary,
                    ])
                },
            ],
            [
                'return auth methods with process code DiiaIdExistsOnAnotherDevice in case user already has DiiaId identifier',
                ProcessCode.DiiaIdExistsOnAnotherDevice,
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.DiiaIdCreation, [AuthMethod.PhotoId]),
                    checks: [ProcessCode.DiiaIdExistsOnAnotherDevice],
                    [AuthMethod.PhotoId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                new userAuthStepsModel({
                    code,
                    mobileUid: headers.mobileUid,
                    processId,
                    status: UserAuthStepsStatus.Processing,
                    steps: [],
                    conditions: [],
                    isRevoked: false,
                    userIdentifier: user.identifier,
                }),
                (): void => {
                    jest.spyOn(userService, 'hasDiiaIdIdentifier').mockResolvedValueOnce(true)
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(userService.hasDiiaIdIdentifier).toHaveBeenCalledWith(user.identifier, mobileUid)
                },
            ],
            [
                'skip performing checks in case steps list is not empty',
                undefined,
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.DiiaIdCreation, [AuthMethod.PhotoId]),
                    checks: [ProcessCode.DiiaIdExistsOnAnotherDevice],
                    [AuthMethod.PhotoId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                new userAuthStepsModel({
                    code,
                    mobileUid: headers.mobileUid,
                    processId,
                    status: UserAuthStepsStatus.Processing,
                    steps: [{ method: AuthMethod.PhotoId, attempts: 0, startDate: now }],
                    conditions: [],
                    isRevoked: false,
                    userIdentifier: user.identifier,
                }),
                (): void => {},
                (): void => {},
            ],
        ])(
            'should %s',
            async (_msg, expectedProcessCode, inputAuthSchema, inputAuthSteps, defineSpecificSpies, checkSpecificExpectations) => {
                const { mobileUid } = headers
                const { code: schemaCode, methods: authMethods } = inputAuthSchema.toObject()

                jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(inputAuthSchema)
                jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(inputAuthSteps)
                defineSpecificSpies()
                diiaUtilsMock.handleError.mockImplementationOnce(async (e: Error, cb: CallableFunction) => {
                    return cb(e)
                })
                jest.spyOn(userAuthStepsDataMapper, 'toAuthMethodsResponse').mockImplementationOnce(
                    (_authSchema, _authSteps, methods, processCode): AuthMethodsResponse => ({
                        processId,
                        skipAuthMethods: false,
                        authMethods: methods,
                        processCode,
                    }),
                )

                expect(await userAuthStepsService.getAuthMethods(schemaCode, headers, processId, user)).toEqual({
                    processId,
                    skipAuthMethods: false,
                    authMethods,
                    processCode: expectedProcessCode,
                })

                checkSpecificExpectations()
                expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
                expect(userAuthStepsModel.findOne).toHaveBeenCalledWith({ processId, mobileUid, isRevoked: { $ne: true }, code })
            },
        )

        it.each([
            [
                'user is under 14 years old',
                new BadRequestError('', {}, ProcessCode.UserIsUnder14YearsOld),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.DiiaIdCreation, [AuthMethod.PhotoId]),
                    checks: [ProcessCode.UserIsUnder14YearsOld],
                    [AuthMethod.PhotoId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                new userAuthStepsModel({
                    code,
                    mobileUid: headers.mobileUid,
                    processId,
                    status: UserAuthStepsStatus.Processing,
                    steps: [],
                    conditions: [],
                    isRevoked: false,
                    userIdentifier: user.identifier,
                }),
                user,
                (): void => {
                    jest.spyOn(appUtils, 'getAge').mockReturnValueOnce(13)
                },
                (): void => {
                    expect(appUtils.getAge).toHaveBeenCalledWith(user.birthDay)
                },
            ],
            [
                'user is not provided to perform checks',
                new BadRequestError('User is not provided to perform checks'),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.DiiaIdCreation, [AuthMethod.PhotoId]),
                    checks: [ProcessCode.UserIsUnder14YearsOld],
                    [AuthMethod.PhotoId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                new userAuthStepsModel({
                    code,
                    mobileUid: headers.mobileUid,
                    processId,
                    status: UserAuthStepsStatus.Processing,
                    steps: [],
                    conditions: [],
                    isRevoked: false,
                    userIdentifier: user.identifier,
                }),
                undefined,
                (): void => {},
                (): void => {},
            ],
            [
                'chain is ended',
                new InternalServerError('', ProcessCode.WaitingPeriodHasExpired),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.DiiaIdCreation, [AuthMethod.PhotoId]),
                    checks: [],
                    [AuthMethod.PhotoId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                new userAuthStepsModel({
                    code,
                    mobileUid: headers.mobileUid,
                    processId,
                    status: UserAuthStepsStatus.Processing,
                    steps: [{ method: AuthMethod.BankId, attempts: 1, endDate: now }],
                    conditions: [],
                    isRevoked: false,
                    userIdentifier: user.identifier,
                }),
                undefined,
                (): void => {},
                (): void => {
                    expect(logger.error).toHaveBeenCalledWith('Chain is ended', {
                        processId,
                        step: expect.any(Object),
                        authSchemaMethod: undefined,
                    })
                },
            ],
        ])(
            'should fail with error in case %s',
            async (_msg, expectedError, inputAuthSchema, inputAuthSteps, inputUser, defineSpecificSpies, checkSpecificExpectations) => {
                const { mobileUid } = headers
                const { code: schemaCode } = inputAuthSchema.toObject()

                jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(inputAuthSchema)
                jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(inputAuthSteps)
                defineSpecificSpies()

                await expect(async () => {
                    await userAuthStepsService.getAuthMethods(schemaCode, headers, processId, inputUser)
                }).rejects.toEqual(expectedError)

                checkSpecificExpectations()
                expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
                expect(userAuthStepsModel.findOne).toHaveBeenCalledWith({ processId, mobileUid, isRevoked: { $ne: true }, code })
            },
        )
    })

    describe('method: setStepMethod', () => {
        const code = AuthSchemaCode.Authorization
        const headers = testKit.session.getHeaders()
        const processId = randomUUID()

        it.each([
            [
                'put step data for the first time',
                new userAuthStepsModel({
                    processId,
                    code,
                    steps: [],
                    status: UserAuthStepsStatus.Processing,
                }),
                new userAuthStepsModel({
                    processId,
                    code,
                    steps: [{ method: AuthMethod.BankId, attempts: 1, verifyAttempts: 0, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
            ],
            [
                'increase attempts for existing step',
                new userAuthStepsModel({
                    processId,
                    code,
                    steps: [{ method: AuthMethod.BankId, attempts: 1, verifyAttempts: 0, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new userAuthStepsModel({
                    processId,
                    code,
                    steps: [{ method: AuthMethod.BankId, attempts: 2, verifyAttempts: 0, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
            ],
        ])('should successfully %s', async (_msg, inputAuthSteps, expectedAuthSteps) => {
            const { mobileUid } = headers
            const authSchema = new authSchemaModel({
                ...composeAuthSchema(code, [AuthMethod.BankId]),
                [AuthMethod.BankId]: {
                    maxAttempts: 3,
                    maxVerifyAttempts: 1,
                    ttl: 180000,
                },
            })

            jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(inputAuthSteps)
            jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(authSchema)
            jest.spyOn(inputAuthSteps, 'save').mockResolvedValueOnce(inputAuthSteps)

            const [actualAuthSchema, actualAuthSteps] = await userAuthStepsService.setStepMethod(
                undefined,
                headers,
                AuthMethod.BankId,
                processId,
            )

            expect(actualAuthSchema.toObject()).toEqual(authSchema.toObject())
            expect(actualAuthSteps.toObject().steps).toEqual(expectedAuthSteps.toObject().steps)

            expect(userAuthStepsModel.findOne).toHaveBeenCalledWith({ processId, mobileUid, isRevoked: { $ne: true } })
            expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
            expect(inputAuthSteps.save).toHaveBeenCalledWith()
        })
    })

    describe('method: `verifyAuthMethod`', () => {
        const requestId = randomUUID()
        const processId = randomUUID()
        const headers = testKit.session.getHeaders()
        const { user } = testKit.session.getUserSession()

        it.each([
            [
                AuthSchemaCode.Authorization,
                AuthMethod.BankId,
                undefined,
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Authorization,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Authorization, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 3,
                        ttl: 180000,
                    },
                }),
                [AuthSchemaCondition.HasDocumentPhoto],
                ProcessCode.AuthBankSuccessWithPhoto,
                authorizationStrategyService,
                (): void => {},
                (): void => {},
            ],
            [
                AuthSchemaCode.CabinetAuthorization,
                AuthMethod.BankId,
                undefined,
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.CabinetAuthorization,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, startDate: now }],
                    conditions: [AuthSchemaCondition.HasDocumentPhoto],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.CabinetAuthorization, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                        methods: [AuthMethod.PhotoId],
                        [AuthMethod.PhotoId]: {
                            maxAttempts: 3,
                            maxVerifyAttempts: 1,
                            ttl: 180000,
                        },
                    },
                }),
                [AuthSchemaCondition.HasDocumentPhoto],
                ProcessCode.AuthBankSuccessWithPhoto,
                cabinetAuthorizationStrategyService,
                (): void => {},
                (): void => {},
            ],
            [
                AuthSchemaCode.DiiaIdCreation,
                AuthMethod.BankId,
                undefined,
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.DiiaIdCreation,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.DiiaIdCreation, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 3,
                        ttl: 180000,
                    },
                }),
                [AuthSchemaCondition.HasDocumentPhoto],
                undefined,
                diiaIdCreationStrategyService,
                (): void => {},
                (): void => {},
            ],
            [
                AuthSchemaCode.Prolong,
                AuthMethod.BankId,
                user,
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Prolong,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Prolong, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 3,
                        ttl: 180000,
                    },
                }),
                [AuthSchemaCondition.HasDocumentPhoto],
                ProcessCode.AuthBankSuccessWithPhoto,
                prolongStrategyService,
                (): void => {
                    jest.spyOn(userAuthStepsService, 'completeSteps').mockResolvedValueOnce(<UserAuthStepsModel>{})
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(userAuthStepsService.completeSteps).toHaveBeenCalledWith({
                        code: AuthSchemaCode.Prolong,
                        processId,
                        mobileUid,
                        userIdentifier: user.identifier,
                    })
                },
            ],
        ])(
            'should successfully pass auth method verification when code is %s and method %s',
            async (
                _code,
                methodToVerify,
                inputUser,
                validAuthStepsModel,
                validAuthSchemaModel,
                conditions,
                expectedProcessCode,
                expectedStrategy,
                defineSpecificSpies,
                checkSpecificExpectations,
            ) => {
                jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValue(validAuthStepsModel)
                jest.spyOn(authSchemaService, 'getByCode').mockResolvedValue(validAuthSchemaModel)
                jest.spyOn(validAuthStepsModel, 'save').mockResolvedValue(validAuthStepsModel)
                jest.spyOn(validAuthSchemaModel, 'toObject').mockReturnValue(validAuthSchemaModel)
                jest.spyOn(expectedStrategy, 'verify').mockResolvedValue(conditions)
                jest.spyOn(processCodeDefinerServiceMock, 'getProcessCodeOnVerify').mockReturnValue(<ProcessCode>expectedProcessCode)
                defineSpecificSpies()

                expect(
                    await userAuthStepsService.verifyAuthMethod(methodToVerify, requestId, inputUser, headers, processId, { headers }),
                ).toEqual(expectedProcessCode)
                expect(expectedStrategy.verify).toHaveBeenLastCalledWith({
                    method: methodToVerify,
                    requestId,
                    authSteps: validAuthStepsModel,
                    user: inputUser,
                    headers,
                    authMethodParams: { headers },
                })
                checkSpecificExpectations()
            },
        )

        it('should fail with error in case steps are empty', async () => {
            const { mobileUid } = headers
            const validAuthStepsModel = new userAuthStepsModel({
                processId,
                code: AuthSchemaCode.Authorization,
                steps: [],
                status: UserAuthStepsStatus.Processing,
            })

            jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValue(validAuthStepsModel)

            await expect(async () => {
                await userAuthStepsService.verifyAuthMethod(AuthMethod.BankId, requestId, undefined, headers, processId, { headers })
            }).rejects.toEqual(new AccessDeniedError())

            expect(userAuthStepsModel.findOne).toHaveBeenCalledWith({ processId, mobileUid, isRevoked: { $ne: true } })
            expect(logger.error).toHaveBeenCalledWith('Auth steps are empty', { processId })
        })

        it('should throw error in case strategy verification failed with error', async () => {
            const methodToVerify = AuthMethod.BankId
            const validAuthStepsModel = new userAuthStepsModel({
                processId,
                code: AuthSchemaCode.Authorization,
                steps: [{ method: AuthMethod.BankId, attempts: 0, startDate: now }],
                status: UserAuthStepsStatus.Processing,
            })
            const validAuthSchemaModel = new authSchemaModel({
                ...composeAuthSchema(AuthSchemaCode.Authorization, [AuthMethod.BankId]),
                [AuthMethod.BankId]: {
                    maxAttempts: 3,
                    maxVerifyAttempts: 3,
                    ttl: 180000,
                },
            })
            const expectedError = new AccessDeniedError('Failed to verify step', {}, ProcessCode.AuthFailed)

            jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValue(validAuthStepsModel)
            jest.spyOn(authSchemaService, 'getByCode').mockResolvedValue(validAuthSchemaModel)
            jest.spyOn(validAuthStepsModel, 'save').mockResolvedValue(validAuthStepsModel)
            jest.spyOn(validAuthSchemaModel, 'toObject').mockReturnValue(validAuthSchemaModel)
            jest.spyOn(authorizationStrategyService, 'verify').mockRejectedValueOnce(new Error('Unable to verify'))
            diiaUtilsMock.handleError.mockImplementationOnce(async (e: Error, cb: CallableFunction) => {
                await cb(new ApiError(e.message, ProcessCode.AuthFailed))
            })

            await expect(async () => {
                await userAuthStepsService.verifyAuthMethod(methodToVerify, requestId, undefined, headers, processId, { headers })
            }).rejects.toEqual(expectedError)
            expect(authorizationStrategyService.verify).toHaveBeenLastCalledWith({
                method: methodToVerify,
                requestId,
                authSteps: validAuthStepsModel,
                user: undefined,
                headers,
                authMethodParams: { headers },
            })
            expect(logger.error).toHaveBeenCalledWith(`Failed to run auth steps finish strategy. Process: ${processId}`, {
                err: expect.any(Error),
            })
        })

        it.each([
            [
                'user is not provided for strategy which requires it',
                new BadRequestError('User is not provided'),
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Prolong,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Prolong, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                (): void => {},
                undefined,
            ],
            [
                'provided method is not expected',
                new AccessDeniedError('', {}, ProcessCode.WaitingPeriodHasExpired),
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Authorization,
                    steps: [{ method: AuthMethod.PrivatBank, attempts: 0, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Authorization, [AuthMethod.BankId, AuthMethod.PrivatBank]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                    [AuthMethod.PrivatBank]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                (): void => {
                    expect(logger.error).toHaveBeenCalledWith('Provided method is not expected', { processId })
                    expect(logger.error).toHaveBeenCalledWith(`Auth method validation error. Process: ${processId}`, {
                        err: expect.any(Error),
                    })
                    expect(logger.info).toHaveBeenCalledWith('Failed prev user auth schemas: 1')
                },
                undefined,
            ],
            [
                'verify attempts limit is exceed',
                new AccessDeniedError('', {}, ProcessCode.AuthFailed),
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Authorization,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, verifyAttempts: 3, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Authorization, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 2,
                        ttl: 180000,
                    },
                }),
                (): void => {
                    expect(logger.error).toHaveBeenCalledWith('Verify attempts limit is exceed', { processId })
                    expect(logger.error).toHaveBeenCalledWith(`Auth method validation error. Process: ${processId}`, {
                        err: expect.any(Error),
                    })
                    expect(logger.info).toHaveBeenCalledWith('Failed prev user auth schemas: 1')
                },
                undefined,
            ],
            [
                'attempts limit is exceed',
                new AccessDeniedError('', {}, ProcessCode.AuthFailed),
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Authorization,
                    steps: [{ method: AuthMethod.BankId, attempts: 4, verifyAttempts: 1, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Authorization, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 2,
                        ttl: 180000,
                    },
                }),
                (): void => {
                    expect(logger.error).toHaveBeenCalledWith('Attempts limit is exceed', { processId })
                    expect(logger.error).toHaveBeenCalledWith(`Auth method validation error. Process: ${processId}`, {
                        err: expect.any(Error),
                    })
                    expect(logger.info).toHaveBeenCalledWith('Failed prev user auth schemas: 1')
                },
                user,
            ],
            [
                'step time is expired',
                new AccessDeniedError('', {}, ProcessCode.AuthFailed),
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Authorization,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, verifyAttempts: 1, startDate: new Date(now.getTime() - 1000) }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Authorization, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180,
                    },
                }),
                (): void => {
                    expect(logger.error).toHaveBeenCalledWith('Step time is expired', {
                        processId,
                        stepTime: 1000,
                        ttl: 180,
                        startDate: new Date(now.getTime() - 1000),
                    })
                    expect(logger.error).toHaveBeenCalledWith(`Auth method validation error. Process: ${processId}`, {
                        err: expect.any(Error),
                    })
                    expect(logger.info).toHaveBeenCalledWith('Failed prev user auth schemas: 1')
                },
                user,
            ],
            [
                'step already ended',
                new AccessDeniedError('', {}, ProcessCode.AuthFailed),
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Authorization,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, verifyAttempts: 1, startDate: now, endDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Authorization, [AuthMethod.BankId]),
                    [AuthMethod.BankId]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                (): void => {
                    expect(logger.error).toHaveBeenCalledWith('Step already ended', { processId })
                    expect(logger.error).toHaveBeenCalledWith(`Auth method validation error. Process: ${processId}`, {
                        err: expect.any(Error),
                    })
                    expect(logger.info).toHaveBeenCalledWith('Failed prev user auth schemas: 1')
                },
                undefined,
            ],
            [
                'provided method is not allowed',
                new AccessDeniedError('', {}, ProcessCode.AuthFailed),
                new userAuthStepsModel({
                    processId,
                    code: AuthSchemaCode.Authorization,
                    steps: [{ method: AuthMethod.BankId, attempts: 0, verifyAttempts: 1, startDate: now }],
                    status: UserAuthStepsStatus.Processing,
                }),
                new authSchemaModel({
                    ...composeAuthSchema(AuthSchemaCode.Authorization, [AuthMethod.PrivatBank]),
                    [AuthMethod.PrivatBank]: {
                        maxAttempts: 3,
                        maxVerifyAttempts: 1,
                        ttl: 180000,
                    },
                }),
                (): void => {
                    expect(logger.error).toHaveBeenCalledWith('Provided method is not allowed', { processId })
                    expect(logger.error).toHaveBeenCalledWith(`Auth method validation error. Process: ${processId}`, {
                        err: expect.any(Error),
                    })
                    expect(logger.info).toHaveBeenCalledWith('Failed prev user auth schemas: 1')
                },
                undefined,
            ],
        ])(
            'should fail with error in case %s',
            async (_msg, expectedError, validAuthStepsModel, validAuthSchemaModel, checkSpecificExpectations, inputUser?) => {
                const methodToVerify = AuthMethod.BankId

                jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValue(validAuthStepsModel)
                jest.spyOn(authSchemaService, 'getByCode').mockResolvedValue(validAuthSchemaModel)
                jest.spyOn(validAuthStepsModel, 'save').mockResolvedValue(validAuthStepsModel)
                jest.spyOn(userAuthStepsModel, 'updateMany').mockResolvedValue(<UpdateWriteOpResult>{ modifiedCount: 1 })
                jest.spyOn(validAuthSchemaModel, 'toObject').mockReturnValue(validAuthSchemaModel)
                diiaUtilsMock.handleError.mockImplementationOnce(async (e: Error, cb: CallableFunction) => {
                    await cb(new ApiError(e.message, ProcessCode.AuthFailed))
                })

                await expect(async () => {
                    await userAuthStepsService.verifyAuthMethod(methodToVerify, requestId, inputUser, headers, processId, { headers })
                }).rejects.toEqual(expectedError)

                checkSpecificExpectations()
            },
        )
    })

    describe('method: completeSteps', () => {
        it('should successfully complete steps', async () => {
            const processId = randomUUID()
            const headers = testKit.session.getHeaders()
            const { mobileUid } = headers
            const params = {
                mobileUid,
                processId,
            }
            const validAuthStepsModel = new userAuthStepsModel({
                processId,
                code: AuthSchemaCode.Authorization,
                steps: [{ method: AuthMethod.BankId, attempts: 1, endDate: now }],
                status: UserAuthStepsStatus.Success,
            })

            jest.spyOn(userAuthStepsService, 'verifyUserAuthStepSuccessful').mockResolvedValueOnce(validAuthStepsModel)
            jest.spyOn(validAuthStepsModel, 'save').mockResolvedValueOnce(validAuthStepsModel)

            expect(await userAuthStepsService.completeSteps(params)).toEqual(validAuthStepsModel)

            const { status: actualStatus, statusHistory: actualStatusHistory } = validAuthStepsModel.toObject()

            expect(userAuthStepsService.verifyUserAuthStepSuccessful).toHaveBeenCalledWith(params)
            expect(logger.info).toHaveBeenCalledWith('Setting status for user auth steps', {
                processId,
                status: UserAuthStepsStatus.Completed,
            })
            expect(validAuthStepsModel.save).toHaveBeenCalledWith()
            expect(actualStatus).toEqual(UserAuthStepsStatus.Completed)
            expect(actualStatusHistory).toEqual([
                {
                    status: UserAuthStepsStatus.Completed,
                    date: now,
                },
            ])
        })
    })

    describe('method: verifyUserAuthStepSuccessful', () => {
        const code = AuthSchemaCode.Authorization
        const processId = randomUUID()
        const headers = testKit.session.getHeaders()
        const {
            user: { identifier: userIdentifier = 'user-identifier' },
        } = testKit.session.getUserSession()
        const { mobileUid } = headers
        const query = {
            code: {
                $in: [code],
            },
            processId,
            mobileUid,
            isRevoked: { $ne: true },
            userIdentifier,
        }

        it('should successfully verify user auth step as successful', async () => {
            const params = { code, userIdentifier, mobileUid, processId }
            const validAuthStepsModel = new userAuthStepsModel({
                processId,
                code: AuthSchemaCode.Authorization,
                steps: [{ method: AuthMethod.BankId, attempts: 1, endDate: now }],
                status: UserAuthStepsStatus.Success,
            })

            jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(validAuthStepsModel)

            expect(await userAuthStepsService.verifyUserAuthStepSuccessful(params)).toEqual(validAuthStepsModel)

            expect(userAuthStepsModel.findOne).toHaveBeenCalledWith(query)
        })

        it.each([
            [
                'user auth steps not found',
                new ModelNotFoundError(userAuthStepsModel.modelName, processId),
                (): void => {
                    jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(null)
                },
                (): void => {
                    expect(userAuthStepsModel.findOne).toHaveBeenCalledWith(query)
                    expect(logger.error).toHaveBeenCalledWith('User auth steps not found', query)
                },
            ],
            [
                'expected status is not success',
                new AccessDeniedError('Expected status does not match with actual value', {}),
                (): void => {
                    jest.spyOn(userAuthStepsModel, 'findOne').mockResolvedValueOnce(
                        new userAuthStepsModel({
                            processId,
                            code: AuthSchemaCode.Authorization,
                            steps: [{ method: AuthMethod.BankId, attempts: 1, startDate: now }],
                            status: UserAuthStepsStatus.Processing,
                        }),
                    )
                },
                (): void => {
                    expect(userAuthStepsModel.findOne).toHaveBeenCalledWith(query)
                    expect(logger.error).toHaveBeenCalledWith('Status mismatch', {
                        status: UserAuthStepsStatus.Success,
                        result: UserAuthStepsStatus.Processing,
                    })
                },
            ],
        ])('should fail with error in case %s', async (_msg, expectedError, defineSpies, checkExpectations) => {
            const params = { code, userIdentifier, mobileUid, processId }

            defineSpies()

            await expect(async () => {
                await userAuthStepsService.verifyUserAuthStepSuccessful(params)
            }).rejects.toEqual(expectedError)

            checkExpectations()
        })
    })

    describe('method: revokeSubmitAfterUserAuthSteps', () => {
        const headers = testKit.session.getHeaders()
        const { mobileUid } = headers
        const userIdentifier = 'user-identifier'

        it('should successfully revoke submit after user steps in case admit after is not empty', async () => {
            const code = AuthSchemaCode.DiiaIdCreation
            const request = { code, mobileUid, userIdentifier }
            const validAuthSchemaModel = new authSchemaModel({
                ...composeAuthSchema(code, [AuthMethod.BankId]),
                [AuthMethod.BankId]: {
                    maxAttempts: 3,
                    maxVerifyAttempts: 1,
                    ttl: 180000,
                },
                admitAfter: [{ code: AuthSchemaCode.Authorization }],
            })
            const {
                authService: {
                    schema: { admissionStepsTtl },
                },
            } = config
            const thresholdDate = new Date(now.getTime() - admissionStepsTtl)

            jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(validAuthSchemaModel)
            jest.spyOn(userAuthStepsModel, 'updateMany').mockResolvedValueOnce(<UpdateWriteOpResult>{ modifiedCount: 1 })

            expect(await userAuthStepsService.revokeSubmitAfterUserAuthSteps(request)).toEqual({ success: true, revokedActions: 1 })

            expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
            expect(userAuthStepsModel.updateMany).toHaveBeenCalledWith(
                {
                    $or: [
                        {
                            code: AuthSchemaCode.Authorization,
                            status: UserAuthStepsStatus.Completed,
                            statusHistory: {
                                $elemMatch: { status: UserAuthStepsStatus.Completed, date: { $gte: thresholdDate } },
                            },
                            isRevoked: { $ne: true },
                        },
                    ],
                    mobileUid,
                    userIdentifier,
                },
                { isRevoked: true },
            )
        })

        it('should skip to revoke submit after user steps in case admit after list is empty', async () => {
            const code = AuthSchemaCode.DiiaIdCreation
            const request = { code, mobileUid, userIdentifier }
            const validAuthSchemaModel = new authSchemaModel({
                ...composeAuthSchema(code, [AuthMethod.BankId]),
                [AuthMethod.BankId]: {
                    maxAttempts: 3,
                    maxVerifyAttempts: 1,
                    ttl: 180000,
                },
                admitAfter: [],
            })

            jest.spyOn(authSchemaService, 'getByCode').mockResolvedValueOnce(validAuthSchemaModel)

            expect(await userAuthStepsService.revokeSubmitAfterUserAuthSteps(request)).toEqual({ success: true, revokedActions: 0 })

            expect(authSchemaService.getByCode).toHaveBeenCalledWith(code)
        })
    })
})
