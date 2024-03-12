/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-conditional-in-test */
import moment from 'moment'

import { IdentifierService } from '@diia-inhouse/crypto'
import { UserSession } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import CompleteUserAuthStepsAction from '@actions/v1/completeUserAuthSteps'
import AuthUrlAction from '@actions/v3/authUrl'
import GetAuthMethodsAction from '@actions/v3/getAuthMethods'

import UserService from '@services/user'

import authSchemaModel from '@models/authSchema'
import userAuthStepsModel from '@models/userAuthSteps'

import UserAuthStepsServiceMock from '@mocks/services/userAuthSteps'

import Helpers from '@tests/helpers'
import UserSessionGenerator from '@tests/mocks/userSession'
import { getApp } from '@tests/utils/getApp'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v3/getAuthMethods'
import { AppConfig } from '@interfaces/config'
import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthSteps, UserAuthStepsStatus, UserAuthStepsStatusHistoryItem } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { ButtonAction } from '@interfaces/services/userAuthSteps'

describe(`Action ${GetAuthMethodsAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let config: AppConfig
    let identifierService: IdentifierService
    let userSessionGenerator: UserSessionGenerator
    let userService: UserService
    let completeUserAuthStepsAction: CompleteUserAuthStepsAction
    let authUrlAction: AuthUrlAction
    let getAuthMethodsAction: GetAuthMethodsAction
    let userAuthStepsServiceMock: UserAuthStepsServiceMock

    beforeAll(async () => {
        app = await getApp()
        config = app.container.resolve('config')
        identifierService = app.container.resolve('identifier')
        userSessionGenerator = new UserSessionGenerator(identifierService)
        userService = app.container.resolve('userService')
        completeUserAuthStepsAction = app.container.build(CompleteUserAuthStepsAction)
        authUrlAction = app.container.build(AuthUrlAction)
        getAuthMethodsAction = app.container.build(GetAuthMethodsAction)
        userAuthStepsServiceMock = new UserAuthStepsServiceMock(app)
        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe(`Auth schema ${AuthSchemaCode.Authorization}`, () => {
        const code = AuthSchemaCode.Authorization

        it('should return initial auth methods if processId is not provided', async () => {
            const headers = userSessionGenerator.getHeaders()
            const args = { params: { code }, headers }
            const result: ActionResult = await getAuthMethodsAction.handler(args)

            const [authSchema, steps] = await Promise.all([
                authSchemaModel.findOne({ code }),
                userAuthStepsModel.findOneAndDelete({ mobileUid: headers.mobileUid }),
            ])

            expect(result).toEqual<ActionResult>({
                processId: expect.any(String),
                title: expect.any(String),
                authMethods: authSchema!.toObject().methods,
                button: { action: ButtonAction.Close },
                skipAuthMethods: false,
            })

            expect(steps).toMatchObject<UserAuthSteps>({
                code,
                mobileUid: headers.mobileUid,
                processId: result.processId,
                status: UserAuthStepsStatus.Processing,
                statusHistory: [{ status: UserAuthStepsStatus.Processing, date: expect.any(Date) }],
                steps: [],
                conditions: [],
                isRevoked: false,
            })
        })

        it('should return initial auth methods if processId is provided without any completed steps', async () => {
            const headers = userSessionGenerator.getHeaders()
            const { processId }: ActionResult = await getAuthMethodsAction.handler({ params: { code }, headers })
            const result: ActionResult = await getAuthMethodsAction.handler({ params: { code, processId }, headers })

            const [authSchema, steps] = await Promise.all([
                authSchemaModel.findOne({ code }),
                userAuthStepsModel.findOneAndDelete({ mobileUid: headers.mobileUid }),
            ])

            expect(result).toEqual<ActionResult>({
                processId,
                title: expect.any(String),
                authMethods: authSchema!.toObject().methods,
                button: { action: ButtonAction.Close },
                skipAuthMethods: false,
            })

            expect(steps).toMatchObject<UserAuthSteps>({
                code,
                mobileUid: headers.mobileUid,
                processId,
                status: UserAuthStepsStatus.Processing,
                statusHistory: [{ status: UserAuthStepsStatus.Processing, date: expect.any(Date) }],
                steps: [],
                conditions: [],
                isRevoked: false,
            })
        })

        it('should return previously selected auth method on second try', async () => {
            const headers = userSessionGenerator.getHeaders()
            const { processId, authMethods = [] }: ActionResult = await getAuthMethodsAction.handler({ params: { code }, headers })
            const selectedAuthMethod = authMethods[authMethods.length - 1]

            await authUrlAction.handler({ params: { processId, target: selectedAuthMethod }, headers })

            const { authMethods: secondTryMethods } = await getAuthMethodsAction.handler({ params: { code, processId }, headers })

            expect(secondTryMethods).toEqual([selectedAuthMethod])
        })
    })

    describe(`Auth schema ${AuthSchemaCode.DiiaIdCreation}`, () => {
        const code = AuthSchemaCode.DiiaIdCreation

        it('should return error if session is not provided', async () => {
            expect.assertions(1)

            const args: CustomActionArguments = { params: { code }, headers: userSessionGenerator.getHeaders() }

            await expect(getAuthMethodsAction.handler(args)).rejects.toThrow('User is not provided')
        })

        it('should return error if one of the checks is not passed', async () => {
            const result = await authSchemaModel.findOne({ code })
            const checks = result?.checks

            expect.assertions(2)
            Helpers.assertNotToBeUndefined(checks)

            for (const processCode of checks) {
                const headers = userSessionGenerator.getHeaders()

                switch (processCode) {
                    case ProcessCode.UserIsUnder14YearsOld: {
                        const args: CustomActionArguments = {
                            params: { code },
                            headers,
                            session: userSessionGenerator.getUserSession({ birthDay: '10.10.2021' }),
                        }
                        try {
                            await getAuthMethodsAction.handler(args)
                        } catch (e) {
                            // eslint-disable-next-line @typescript-eslint/no-loop-func
                            return utils.handleError(e, (error) => {
                                const errorCode = error.getData().processCode

                                if (!errorCode) {
                                    throw new Error(`Test failed: unexpected error ${error}`)
                                }

                                return expect(errorCode).toEqual(processCode)
                            })
                        }

                        break
                    }
                    case ProcessCode.NoRequiredDocumentForDiiaId: {
                        jest.spyOn(userService, 'hasOneOfDocuments').mockImplementationOnce(async () => false)

                        const args: CustomActionArguments = { params: { code }, headers, session: userSessionGenerator.getUserSession() }
                        try {
                            await getAuthMethodsAction.handler(args)
                        } catch (e) {
                            // eslint-disable-next-line @typescript-eslint/no-loop-func
                            return utils.handleError(e, (error) => {
                                const errorCode = error.getData().processCode

                                if (!errorCode) {
                                    throw new Error(`Test failed: unexpected error ${error}`)
                                }

                                return expect(errorCode).toEqual(processCode)
                            })
                        }

                        break
                    }
                    case ProcessCode.DiiaIdExistsOnAnotherDevice: {
                        jest.spyOn(userService, 'hasOneOfDocuments').mockImplementationOnce(async () => true)
                        jest.spyOn(userService, 'hasDiiaIdIdentifier').mockImplementationOnce(async () => true)

                        const args: CustomActionArguments = { params: { code }, headers, session: userSessionGenerator.getUserSession() }
                        try {
                            await getAuthMethodsAction.handler(args)
                        } catch (e) {
                            // eslint-disable-next-line @typescript-eslint/no-loop-func
                            return utils.handleError(e, (error) => {
                                const errorCode = error.getData().processCode

                                if (!errorCode) {
                                    throw new Error(`Test failed: unexpected error ${error}`)
                                }

                                return expect(errorCode).toEqual(processCode)
                            })
                        }

                        break
                    }
                    default: {
                        throw new Error(`Unhandled check: ${processCode}`)
                    }
                }
            }
        })

        it('should return initial auth methods', async () => {
            const headers = userSessionGenerator.getHeaders()

            jest.spyOn(userService, 'hasOneOfDocuments').mockImplementationOnce(async () => true)
            jest.spyOn(userService, 'hasDiiaIdIdentifier').mockImplementationOnce(async () => false)

            const args: CustomActionArguments = { params: { code }, headers, session: userSessionGenerator.getUserSession() }
            const result: ActionResult = await getAuthMethodsAction.handler(args)

            const authSchema = await authSchemaModel.findOne({ code })

            expect(result).toEqual<ActionResult>({
                processId: expect.any(String),
                title: expect.any(String),
                authMethods: authSchema!.toObject().methods,
                button: { action: ButtonAction.Close },
                // processCode: ProcessCode.DiiaIdCreationStepsV2,
                skipAuthMethods: false,
            })
        })
    })

    describe(`Auth schema ${AuthSchemaCode.DiiaIdSigning}`, () => {
        const code: AuthSchemaCode = AuthSchemaCode.DiiaIdSigning

        it('should skip auth methods if admission schema is recenlty completed', async () => {
            const session: UserSession = userSessionGenerator.getUserSession()
            const headers = userSessionGenerator.getHeaders()

            const processId = await userAuthStepsServiceMock.finishDiiaIdCreationSteps(session, headers)

            await completeUserAuthStepsAction.handler({
                params: { schemaCode: AuthSchemaCode.DiiaIdCreation, processId },
                headers,
                session,
            })

            const result: ActionResult = await getAuthMethodsAction.handler({ params: { code }, headers, session })

            expect(result).toEqual<ActionResult>({
                processId: expect.any(String),
                skipAuthMethods: true,
            })
        })

        it('should not skip auth methods if admission schema is recenlty not completed', async () => {
            const session: UserSession = userSessionGenerator.getUserSession()
            const headers = userSessionGenerator.getHeaders()

            await userAuthStepsServiceMock.finishDiiaIdCreationSteps(session, headers)
            const { skipAuthMethods }: ActionResult = await getAuthMethodsAction.handler({ params: { code }, headers, session })

            expect(skipAuthMethods).toBe(false)
        })

        it('should not skip auth methods if admission schema completed long ago', async () => {
            const session: UserSession = userSessionGenerator.getUserSession()
            const headers = userSessionGenerator.getHeaders()

            const processId: string = await userAuthStepsServiceMock.finishDiiaIdCreationSteps(session, headers)

            await completeUserAuthStepsAction.handler({
                params: { schemaCode: AuthSchemaCode.DiiaIdCreation, processId },
                headers,
                session,
            })
            const authSteps = await userAuthStepsModel.findOne({ processId })
            const historyItem = authSteps!.statusHistory.find(
                (item: UserAuthStepsStatusHistoryItem) => item.status === UserAuthStepsStatus.Completed,
            )
            const ttl = config.auth.schema.admissionStepsTtl

            historyItem!.date = moment(historyItem!.date)
                .subtract(ttl + 1, 'milliseconds')
                .toDate()
            await authSteps!.save()

            const { skipAuthMethods } = await getAuthMethodsAction.handler({ params: { code }, headers, session })

            expect(skipAuthMethods).toBe(false)
        })
    })
})
