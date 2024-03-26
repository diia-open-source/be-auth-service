import { FilterQuery, UpdateQuery } from 'mongoose'
import { randomUUID as uuid } from 'node:crypto'

import { AccessDeniedError, BadRequestError, InternalServerError, ModelNotFoundError, UnprocessableEntityError } from '@diia-inhouse/errors'
import {
    AppUser,
    DocumentType,
    Logger,
    PublicServiceKebabCaseCode,
    ResidentshipStatus,
    SessionType,
    UserTokenData,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import ProcessCodeDefinerService from './processCodeDefiner'

import Utils from '@src/utils'

import AuthSchemaService from '@services/authSchema'
import DocumentsService from '@services/documents'
import PublicService from '@services/public'
import UserService from '@services/user'
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

import userAuthStepsModel from '@models/userAuthSteps'

import UserAuthStepsDataMapper from '@dataMappers/userAuthStepsDataMapper'

import { AppConfig } from '@interfaces/config'
import { AdmissionSchema, AuthMethod, AuthSchema, AuthSchemaCode, AuthSchemaMethod, AuthSchemaModel } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthSteps, UserAuthStepsModel, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthMethodVerifyParams } from '@interfaces/services/auth'
import {
    AuthMethodsResponse,
    AuthSchemaStrategy,
    AuthStepHeaders,
    AuthStepsSearchParams,
    ExtractAuthMethodsResult,
    RevokeSubmitAfterUserAuthStepsRequest,
    RevokeSubmitAfterUserAuthStepsResult,
    SchemaCode,
    UserAuthStepsValidationParams,
} from '@interfaces/services/userAuthSteps'

export default class UserAuthStepsService {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,

        private readonly appUtils: Utils,
        private readonly authSchemaService: AuthSchemaService,
        private readonly documentsService: DocumentsService,
        private readonly publicService: PublicService,
        private readonly userService: UserService,
        private readonly userAuthStepsDataMapper: UserAuthStepsDataMapper,
        private readonly userAuthStepsProcessCodeDefinerService: ProcessCodeDefinerService,

        private readonly userAuthStepsStrategiesAuthorizationService: AuthorizationStrategyService,
        private readonly userAuthStepsStrategiesCabinetAuthorizationService: CabinetAuthorizationStrategyService,
        private readonly userAuthStepsStrategiesDiiaIdCreationService: DiiaIdCreationStrategyService,
        private readonly userAuthStepsStrategiesDiiaIdSharingBarcodeService: DiiaIdSharingBarcodeStrategyService,
        private readonly userAuthStepsStrategiesDiiaIdSharingDeeplinkDynamicService: DiiaIdSharingDeeplinkDynamicStrategyService,
        private readonly userAuthStepsStrategiesDiiaIdSharingDeeplinkStaticService: DiiaIdSharingDeeplinkStaticStrategyService,
        private readonly userAuthStepsStrategiesDiiaIdSigningService: DiiaIdSigningStrategyService,
        private readonly userAuthStepsStrategiesEResidentApplicantAuthService: EResidentApplicantAuthStrategyService,
        private readonly userAuthStepsStrategiesEResidentAuthService: EResidentAuthStrategyService,
        private readonly userAuthStepsStrategiesEResidentDiiaIdCreationService: EResidentDiiaIdCreationStrategyService,
        private readonly userAuthStepsStrategiesEResidentDiiaIdSigningService: EResidentDiiaIdSigningStrategyService,
        private readonly userAuthStepsStrategiesEResidentFirstAuthService: EResidentFirstAuthStrategyService,
        private readonly userAuthStepsStrategiesMilitaryBondsSigningService: MilitaryBondsSigningStrategyService,
        private readonly userAuthStepsStrategiesMortgageSigningService: MortgageSigningStrategyService,
        private readonly userAuthStepsStrategiesProlongService: ProlongStrategyService,
        private readonly userAuthStepsStrategiesResidencePermitNfcAddingService: ResidencePermitNfcAddingStrategyService,
    ) {}

    private readonly authSchemaStrategyByCode: Record<AuthSchemaCode, AuthSchemaStrategy> = {
        [AuthSchemaCode.Authorization]: this.userAuthStepsStrategiesAuthorizationService,
        [AuthSchemaCode.CabinetAuthorization]: this.userAuthStepsStrategiesCabinetAuthorizationService,
        [AuthSchemaCode.DiiaIdCreation]: this.userAuthStepsStrategiesDiiaIdCreationService,
        [AuthSchemaCode.DiiaIdSharingBarcode]: this.userAuthStepsStrategiesDiiaIdSharingBarcodeService,
        [AuthSchemaCode.DiiaIdSharingDeeplinkDynamic]: this.userAuthStepsStrategiesDiiaIdSharingDeeplinkDynamicService,
        [AuthSchemaCode.DiiaIdSharingDeeplinkStatic]: this.userAuthStepsStrategiesDiiaIdSharingDeeplinkStaticService,
        [AuthSchemaCode.DiiaIdSigning]: this.userAuthStepsStrategiesDiiaIdSigningService,
        [AuthSchemaCode.EResidentApplicantAuth]: this.userAuthStepsStrategiesEResidentApplicantAuthService,
        [AuthSchemaCode.EResidentAuth]: this.userAuthStepsStrategiesEResidentAuthService,
        [AuthSchemaCode.EResidentDiiaIdCreation]: this.userAuthStepsStrategiesEResidentDiiaIdCreationService,
        [AuthSchemaCode.EResidentDiiaIdSigning]: this.userAuthStepsStrategiesEResidentDiiaIdSigningService,
        [AuthSchemaCode.EResidentFirstAuth]: this.userAuthStepsStrategiesEResidentFirstAuthService,
        [AuthSchemaCode.MilitaryBondsSigning]: this.userAuthStepsStrategiesMilitaryBondsSigningService,
        [AuthSchemaCode.MortgageSigning]: this.userAuthStepsStrategiesMortgageSigningService,
        [AuthSchemaCode.Prolong]: this.userAuthStepsStrategiesProlongService,
        [AuthSchemaCode.ResidencePermitNfcAdding]: this.userAuthStepsStrategiesResidencePermitNfcAddingService,
    }

    private readonly authSchemaCodes = Object.values(AuthSchemaCode)

    private readonly authSchemasByPublicService: Partial<Record<SchemaCode, AuthSchemaCode>> = {
        [PublicServiceKebabCaseCode.DepositGuaranteePayments]: AuthSchemaCode.DiiaIdSigning,
        [PublicServiceKebabCaseCode.ResidenceRegistration]: AuthSchemaCode.DiiaIdSigning,
        [PublicServiceKebabCaseCode.VehicleReRegistration]: AuthSchemaCode.DiiaIdSigning,
    }

    private readonly authMethodsProcessCodeMap: Partial<Record<AuthSchemaCode, ProcessCode>> = {
        // [AuthSchemaCode.DiiaIdCreation]: ProcessCode.DiiaIdCreationStepsV2
    }

    async getAuthMethods(
        schemaCode: SchemaCode,
        headers: AuthStepHeaders,
        processId: string | undefined,
        user: UserTokenData | undefined,
    ): Promise<AuthMethodsResponse> {
        const { mobileUid } = headers
        if (!processId) {
            await this.failPrevStepsRecords(mobileUid)
        }

        const code = this.getAuthSchemaCode(schemaCode)
        if (this.authSchemaStrategyByCode[code]?.isUserRequired && !user) {
            throw new BadRequestError('User is not provided')
        }

        const [authSchema, authSteps]: [AuthSchemaModel, UserAuthStepsModel] = await Promise.all([
            this.authSchemaService.getByCode(code),
            processId
                ? this.getByProcessId(processId, mobileUid, UserAuthStepsStatus.Processing, code)
                : this.create(code, mobileUid, user),
        ])
        const skipAuthMethods: boolean = await this.areAuthMethodsShouldBeSkipped(authSchema, authSteps)
        if (skipAuthMethods) {
            return { processId: authSteps.processId, skipAuthMethods }
        }

        const { methods, processCode } = await this.extractAuthMethods(authSchema, authSteps, user, headers)

        return this.userAuthStepsDataMapper.toAuthMethodsResponse(authSchema, authSteps, methods, processCode)
    }

    async setStepMethod(
        user: UserTokenData | undefined,
        headers: AuthStepHeaders,
        method: AuthMethod,
        processId: string,
    ): Promise<[AuthSchemaModel, UserAuthStepsModel]> {
        const { mobileUid } = headers
        const authSteps: UserAuthStepsModel = await this.getByProcessId(processId, mobileUid, UserAuthStepsStatus.Processing)

        const { code, steps = [] } = authSteps
        const authSchema: AuthSchemaModel = await this.authSchemaService.getByCode(code)

        const lastStepIndx: number = steps.length - 1
        if (steps?.[lastStepIndx]?.method === method) {
            steps[lastStepIndx].attempts += 1
            steps[lastStepIndx].verifyAttempts = 0
        } else {
            steps.push({
                method,
                attempts: 1,
                verifyAttempts: 0,
                startDate: new Date(),
            })
        }

        await authSteps.save()

        await this.validateAuthSteps(user, headers, method, authSchema, authSteps)

        return [authSchema, authSteps]
    }

    async verifyAuthMethod(
        method: AuthMethod,
        requestId: string,
        user: UserTokenData | undefined,
        headers: AuthStepHeaders,
        processId: string,
        authMethodParams: AuthMethodVerifyParams,
    ): Promise<ProcessCode> {
        const { mobileUid } = headers
        const authSteps: UserAuthStepsModel = await this.getByProcessId(processId, mobileUid, UserAuthStepsStatus.Processing)

        const { code, steps = [], status } = authSteps
        if (!steps.length) {
            this.logger.error('Auth steps are empty', { processId })

            throw new AccessDeniedError()
        }

        const [authSchema]: [AuthSchemaModel, void] = await Promise.all([
            this.authSchemaService.getByCode(code),
            this.incrementVerifyAttempts(authSteps),
        ])

        await this.validateAuthSteps(user, headers, method, authSchema, authSteps)

        try {
            const strategy = this.authSchemaStrategyByCode[code]

            const newConditions = await strategy.verify({
                method,
                requestId,
                authSteps,
                user,
                headers,
                authMethodParams,
            })

            authSteps.conditions.push(...newConditions)

            const newStatus = this.defineNewStatus(authSteps, authSchema)

            if (newStatus) {
                await this.setStatus(authSteps, newStatus)
            } else {
                await authSteps.save()
            }

            const lastStep = steps[steps.length - 1]

            if (newStatus === UserAuthStepsStatus.Success && strategy.completeOnSuccess) {
                await this.completeSteps({ code, processId, mobileUid, userIdentifier: user?.identifier })
            }

            return this.userAuthStepsProcessCodeDefinerService.getProcessCodeOnVerify(
                newStatus || status,
                lastStep,
                strategy.authStepsStatusToAuthMethodProcessCode,
            )
        } catch (e) {
            return await utils.handleError(e, async (err) => {
                this.logger.error(`Failed to run auth steps finish strategy. Process: ${processId}`, { err })
                await this.validateAuthSteps(user, headers, method, authSchema, authSteps, true)

                const processCode = err.getData().processCode || ProcessCode.AuthFailed

                throw new AccessDeniedError('Failed to verify step', {}, processCode)
            })
        }
    }

    async completeSteps(params: AuthStepsSearchParams): Promise<UserAuthStepsModel | never> {
        const authSteps = await this.verifyUserAuthStepSuccessful(params)

        return await this.setStatus(authSteps, UserAuthStepsStatus.Completed)
    }

    async verifyUserAuthStepSuccessful(params: AuthStepsSearchParams): Promise<UserAuthStepsModel | never> {
        const { code, oneOfCodes, userIdentifier, mobileUid, processId } = params

        const schemaCode = code && this.getAuthSchemaCode(code)
        const query: FilterQuery<UserAuthStepsModel> = {
            code: {
                $in: oneOfCodes || [schemaCode],
            },
            processId,
            mobileUid,
            isRevoked: { $ne: true },
        }
        if (userIdentifier) {
            query.userIdentifier = userIdentifier
        }

        const status = UserAuthStepsStatus.Success

        return await this.getUserAuthStepsAndValidateStatus(query, status)
    }

    async revokeSubmitAfterUserAuthSteps(request: RevokeSubmitAfterUserAuthStepsRequest): Promise<RevokeSubmitAfterUserAuthStepsResult> {
        const { code, mobileUid, userIdentifier } = request
        const { admitAfter = [] } = await this.authSchemaService.getByCode(code)
        if (admitAfter.length) {
            const query: FilterQuery<UserAuthStepsModel> = this.prepareAdmitAfterQuery(admitAfter, mobileUid, userIdentifier)
            const updateResult = await userAuthStepsModel.updateMany(query, { isRevoked: true })

            return { success: true, revokedActions: updateResult.modifiedCount }
        }

        return { success: true, revokedActions: 0 }
    }

    private async validateAuthSteps(
        user: UserTokenData | undefined,
        headers: AuthStepHeaders,
        methodToValidate: AuthMethod,
        authSchemaModel: AuthSchemaModel,
        authSteps: UserAuthSteps,
        throwOnLastAttempt = false,
    ): Promise<void | never> {
        const { mobileUid } = headers
        const { code, processId, steps = [] } = authSteps
        const strategy: AuthSchemaStrategy = this.authSchemaStrategyByCode[code]
        if (strategy.isUserRequired && !user) {
            throw new BadRequestError('User is not provided')
        }

        const stepsValidationParams: UserAuthStepsValidationParams = {
            headers,
            methodToValidate,
            processId,
            shouldCheckVerifyAttempts: false,
            shouldFailPrevSteps: true,
            strategy,
            throwOnLastAttempt,
            authSchemaMethod: <AuthSchema>authSchemaModel.toObject(),
            user,
        }

        try {
            for (const step of steps) {
                await this.validateAuthStep(step, stepsValidationParams)
            }

            const lastStepIndx: number = steps.length - 1
            if (steps[lastStepIndx]?.endDate && steps[lastStepIndx].method === methodToValidate) {
                this.logger.error('Step already ended', { processId })

                throw new AccessDeniedError()
            }

            if (!stepsValidationParams.authSchemaMethod?.methods?.includes(methodToValidate)) {
                this.logger.error('Provided method is not allowed', { processId })

                throw new AccessDeniedError()
            }
        } catch (e) {
            return await utils.handleError(e, async (err) => {
                this.logger.error(`Auth method validation error. Process: ${processId}`, { err })
                if (stepsValidationParams.shouldFailPrevSteps) {
                    await this.failPrevStepsRecords(mobileUid)
                }

                const processCode = err.getData().processCode || ProcessCode.WaitingPeriodHasExpired

                throw new AccessDeniedError('', {}, processCode)
            })
        }
    }

    private async incrementVerifyAttempts(authSteps: UserAuthStepsModel): Promise<void> {
        const { steps = [] } = authSteps

        const lastStepIndx: number = steps.length - 1

        steps[lastStepIndx].verifyAttempts += 1

        await authSteps.save()
    }

    private async extractAuthMethods(
        authSchema: AuthSchemaModel,
        authSteps: UserAuthStepsModel,
        user: AppUser | undefined,
        headers: AuthStepHeaders,
    ): Promise<ExtractAuthMethodsResult> {
        const { processId, steps = [] } = authSteps
        const processCode = await this.performChecks(authSchema, authSteps, user, headers)

        let authSchemaMethod: AuthSchemaMethod | AuthSchema | undefined = <AuthSchema>authSchema.toObject()
        for (const step of steps) {
            const { endDate, method } = step
            if (!endDate) {
                break
            }

            authSchemaMethod = authSchemaMethod?.[method]
            if (!authSchemaMethod) {
                this.logger.error('Chain is ended', { processId, step, authSchemaMethod })
                const { code } = authSchema

                throw new InternalServerError(
                    '',
                    this.authSchemaStrategyByCode[code]?.authSchemaEndedChainProcessCode || ProcessCode.WaitingPeriodHasExpired,
                )
            }
        }

        return { methods: authSchemaMethod.methods || [], processCode }
    }

    private async performChecks(
        authSchema: AuthSchemaModel,
        authSteps: UserAuthStepsModel,
        user: AppUser | undefined,
        headers: AuthStepHeaders,
    ): Promise<ProcessCode | undefined> {
        const { code, checks = [] } = authSchema
        const { steps = [] } = authSteps
        if (!checks.length) {
            return
        }

        if (steps.length) {
            return
        }

        if (!user) {
            throw new BadRequestError('User is not provided to perform checks')
        }

        const { identifier: userIdentifier, birthDay } = user
        const { mobileUid } = headers

        const tasks: Promise<void>[] = []
        for (const processCode of checks) {
            switch (processCode) {
                case ProcessCode.NoRequiredDocumentForDiiaId: {
                    tasks.push(
                        (async (): Promise<void> => {
                            const identityDocuments: DocumentType[] = [
                                DocumentType.InternalPassport,
                                DocumentType.ForeignPassport,
                                DocumentType.ResidencePermitPermanent,
                                DocumentType.ResidencePermitTemporary,
                            ]

                            const hasIdentityDocuments: boolean = await this.userService.hasOneOfDocuments(
                                userIdentifier,
                                identityDocuments,
                            )
                            if (!hasIdentityDocuments) {
                                throw new AccessDeniedError('', {}, processCode)
                            }
                        })(),
                    )

                    break
                }
                case ProcessCode.DiiaIdExistsOnAnotherDevice: {
                    tasks.push(
                        (async (): Promise<void> => {
                            const hasDiiaIdIdentifier: boolean = await this.userService.hasDiiaIdIdentifier(userIdentifier, mobileUid)
                            if (hasDiiaIdIdentifier) {
                                throw new BadRequestError('', {}, processCode)
                            }
                        })(),
                    )

                    break
                }
                case ProcessCode.EResidentTerminationInProgress: {
                    if (user.sessionType !== SessionType.EResident) {
                        break
                    }

                    tasks.push(
                        (async (): Promise<void> => {
                            try {
                                const { terminationInProgress } = await this.publicService.getEResidentPrivateEntrepreneurDetails(user)
                                if (terminationInProgress) {
                                    throw new BadRequestError('', {}, processCode)
                                }
                            } catch (e) {
                                this.logger.info('Failed to get e-Resident private entrepreneur details')
                            }
                        })(),
                    )

                    break
                }
                case ProcessCode.EResidentTerminated: {
                    tasks.push(
                        (async (): Promise<void> => {
                            try {
                                const { itn } = user
                                const { residentshipStatus } = await this.documentsService.getEResidencyToProcess({ itn })

                                if (residentshipStatus === ResidentshipStatus.Terminated) {
                                    throw new BadRequestError('', {}, processCode)
                                }
                            } catch (e) {
                                this.logger.info('Failed to get e-Resident e-Residency document')
                            }
                        })(),
                    )

                    break
                }
                case ProcessCode.UserIsUnder14YearsOld: {
                    const age: number = this.appUtils.getAge(birthDay)
                    if (age < 14) {
                        throw new BadRequestError('', {}, processCode)
                    }

                    break
                }
                default: {
                    throw new UnprocessableEntityError(`Unhandled auth schema check: ${processCode}`)
                }
            }
        }

        try {
            await Promise.all(tasks)
        } catch (e) {
            return utils.handleError(e, (err) => {
                const processCode = err.getData().processCode

                if (processCode) {
                    return processCode
                }

                throw err
            })
        }

        return this.authMethodsProcessCodeMap[code]
    }

    private async failPrevStepsRecords(mobileUid: string): Promise<void> {
        const query: FilterQuery<UserAuthStepsModel> = { mobileUid, status: UserAuthStepsStatus.Processing }
        const status: UserAuthStepsStatus = UserAuthStepsStatus.Failure
        const modifier: UpdateQuery<UserAuthStepsModel> = {
            $set: { status },
            $push: { statusHistory: { status, date: new Date() } },
        }

        const { modifiedCount } = await userAuthStepsModel.updateMany(query, modifier)
        if (modifiedCount) {
            this.logger.info(`Failed prev user auth schemas: ${modifiedCount}`)
        }
    }

    private async create(code: AuthSchemaCode, mobileUid: string, user: UserTokenData | undefined): Promise<UserAuthStepsModel> {
        const status: UserAuthStepsStatus = UserAuthStepsStatus.Processing
        const data: UserAuthSteps = {
            code,
            mobileUid,
            processId: uuid(),
            status,
            statusHistory: [{ status, date: new Date() }],
            conditions: [],
            isRevoked: false,
        }
        if (user) {
            data.userIdentifier = user.identifier
        }

        return await userAuthStepsModel.create(data)
    }

    private async getUserAuthStepsAndValidateStatus(
        query: FilterQuery<UserAuthStepsModel>,
        statusToValidate: UserAuthStepsStatus,
    ): Promise<UserAuthStepsModel | never> {
        const { processId } = query
        const authSteps = await userAuthStepsModel.findOne(query)
        if (!authSteps) {
            this.logger.error('User auth steps not found', query)

            throw new ModelNotFoundError(userAuthStepsModel.modelName, processId)
        }

        if (authSteps.status !== statusToValidate) {
            this.logger.error('Status mismatch', { status: statusToValidate, result: authSteps.status })

            throw new AccessDeniedError('Expected status does not match with actual value', {})
        }

        return authSteps
    }

    private async getByProcessId(
        processId: string,
        mobileUid: string,
        status: UserAuthStepsStatus,
        code?: AuthSchemaCode,
    ): Promise<UserAuthStepsModel> {
        const query: FilterQuery<UserAuthStepsModel> = { processId, mobileUid, isRevoked: { $ne: true } }

        if (code) {
            query.code = code
        }

        return await this.getUserAuthStepsAndValidateStatus(query, status)
    }

    private async setStatus(authSteps: UserAuthStepsModel, status: UserAuthStepsStatus): Promise<UserAuthStepsModel> {
        authSteps.status = status
        authSteps.statusHistory.push({ status, date: new Date() })

        this.logger.info('Setting status for user auth steps', { processId: authSteps.processId, status })
        await authSteps.save()

        return authSteps
    }

    private async areAuthMethodsShouldBeSkipped(authSchema: AuthSchemaModel, authSteps: UserAuthStepsModel): Promise<boolean> {
        const { methods, admitAfter = [] } = authSchema
        const { steps = [], userIdentifier, mobileUid } = authSteps
        if (authSteps.isRevoked) {
            return false
        }

        if (!methods.length) {
            await this.skipAuthMethods(authSteps)

            return true
        }

        if (!admitAfter.length || steps.length || !userIdentifier) {
            return false
        }

        const query: FilterQuery<UserAuthStepsModel> = this.prepareAdmitAfterQuery(admitAfter, mobileUid, userIdentifier)
        const admissionSteps = await userAuthStepsModel.findOne(query).sort({ _id: -1 })
        if (!admissionSteps) {
            return false
        }

        await this.skipAuthMethods(authSteps, admissionSteps.processId)

        return true
    }

    private async skipAuthMethods(authSteps: UserAuthStepsModel, admittedAfterProcess?: string): Promise<void> {
        const { processId } = authSteps

        this.logger.info('Skipping auth methods...', { processId })

        if (admittedAfterProcess) {
            authSteps.admittedAfterProcess = admittedAfterProcess
        }

        await this.setStatus(authSteps, UserAuthStepsStatus.Success)
    }

    private async validateAuthStep(step: UserAuthStep, validationParams: UserAuthStepsValidationParams): Promise<void> {
        const { startDate, method, attempts, verifyAttempts, endDate } = step
        const { headers, methodToValidate, processId, authSchemaMethod, user, strategy } = validationParams

        validationParams.shouldCheckVerifyAttempts = false
        validationParams.shouldFailPrevSteps = true

        if (endDate) {
            validationParams.authSchemaMethod = validationParams.authSchemaMethod?.[method]

            return
        }

        if (method !== methodToValidate) {
            this.logger.error('Provided method is not expected', { processId })

            throw new AccessDeniedError()
        }

        if (!authSchemaMethod || !authSchemaMethod[method]) {
            return
        }

        const { maxAttempts, maxVerifyAttempts, ttl } = <AuthSchemaMethod>authSchemaMethod[method]

        validationParams.shouldCheckVerifyAttempts = maxVerifyAttempts > 1

        if (
            validationParams.shouldCheckVerifyAttempts &&
            (verifyAttempts > maxVerifyAttempts || (validationParams.throwOnLastAttempt && verifyAttempts === maxVerifyAttempts))
        ) {
            this.logger.error('Verify attempts limit is exceed', { processId })

            validationParams.shouldFailPrevSteps =
                attempts > maxAttempts || (validationParams.throwOnLastAttempt && attempts === maxAttempts)

            throw new AccessDeniedError('', {}, ProcessCode.VerifyAttemptsExceeded)
        }

        if (
            attempts > maxAttempts ||
            (validationParams.throwOnLastAttempt && attempts === maxAttempts && !validationParams.shouldCheckVerifyAttempts)
        ) {
            this.logger.error('Attempts limit is exceed', { processId })

            if (user) {
                await strategy.onAttemptsExceeded?.(user, headers)
            }

            throw new AccessDeniedError('', {}, ProcessCode.AuthAttemptsExceeded)
        }

        const stepTime: number = Date.now() - startDate.getTime()
        if (stepTime > ttl) {
            this.logger.error('Step time is expired', { processId, stepTime, ttl, startDate })

            throw new AccessDeniedError('', {}, ProcessCode.WaitingPeriodHasExpired)
        }
    }

    private defineNewStatus(authSteps: UserAuthStepsModel, authSchema: AuthSchemaModel): UserAuthStepsStatus | undefined {
        let newStatus: UserAuthStepsStatus | undefined
        let authSchemaMethod: AuthSchemaMethod | AuthSchemaModel | undefined = <AuthSchemaMethod | AuthSchemaModel>authSchema.toObject()
        const { steps = [] } = authSteps

        steps.forEach((step: UserAuthStep) => {
            const { endDate, method: stepMethod } = step

            authSchemaMethod = authSchemaMethod?.[stepMethod]
            if (endDate) {
                return
            }

            step.endDate = new Date()
            if (!authSchemaMethod?.methods?.length) {
                newStatus = UserAuthStepsStatus.Success

                return
            }
        })

        if (authSchemaMethod && !newStatus) {
            let isFinished = true
            for (const authMethod of Object.values(AuthMethod)) {
                const schema = authSchemaMethod[authMethod]

                if (!schema) {
                    continue
                }

                const { condition } = schema

                if (!condition) {
                    isFinished = false

                    break
                }

                if (authSteps.conditions.includes(condition)) {
                    isFinished = false

                    break
                }
            }

            if (isFinished) {
                newStatus = UserAuthStepsStatus.Success
            }
        }

        return newStatus
    }

    private prepareAdmitAfterQuery(
        admitAfter: AdmissionSchema[],
        mobileUid: string,
        userIdentifier: string,
    ): FilterQuery<UserAuthStepsModel> {
        const ttl: number = this.config.auth.schema.admissionStepsTtl
        const thresholdDate: Date = new Date(Date.now() - ttl)
        const admitAfterFilter = admitAfter.map(({ code, admitAfterStatus }) => {
            return {
                code,
                status: admitAfterStatus || UserAuthStepsStatus.Completed,
                statusHistory: {
                    $elemMatch: { status: admitAfterStatus || UserAuthStepsStatus.Completed, date: { $gte: thresholdDate } },
                },
                isRevoked: { $ne: true },
            }
        })

        return {
            $or: admitAfterFilter,
            mobileUid,
            userIdentifier,
        }
    }

    private getAuthSchemaCode(schemaCode: SchemaCode): AuthSchemaCode {
        const code = <AuthSchemaCode>(this.authSchemasByPublicService[schemaCode] || schemaCode)
        if (!this.authSchemaCodes.includes(code)) {
            throw new BadRequestError(`Unsupported schema code: ${code}`)
        }

        return code
    }
}
