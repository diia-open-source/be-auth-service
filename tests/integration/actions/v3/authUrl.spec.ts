/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-conditional-in-test */
import nock from 'nock'

import { IdentifierService } from '@diia-inhouse/crypto'
import { utils } from '@diia-inhouse/utils'

import AuthUrlAction from '@actions/v3/authUrl'
import GetAuthMethodsAction from '@actions/v3/getAuthMethods'

import authSchemaModel from '@models/authSchema'
import userAuthStepsModel from '@models/userAuthSteps'

import { AuthMockProvider } from '@tests/interfaces/mocks/services/authMethods'
import AuthMethodMockFactory from '@tests/mocks/services/authMethods'
import UserSessionGenerator from '@tests/mocks/userSession'
import { getApp } from '@tests/utils/getApp'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthSteps, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'

describe(`Action ${AuthUrlAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let identifierService: IdentifierService
    let userSessionGenerator: UserSessionGenerator

    let authUrlAction: AuthUrlAction
    let getAuthMethodsAction: GetAuthMethodsAction

    let authMethodMockFactory: AuthMethodMockFactory

    beforeAll(async () => {
        app = await getApp()
        identifierService = app.container.resolve('identifier')!
        userSessionGenerator = new UserSessionGenerator(identifierService)
        authUrlAction = app.container.build(AuthUrlAction)
        getAuthMethodsAction = app.container.build(GetAuthMethodsAction)

        authMethodMockFactory = new AuthMethodMockFactory(app)
    })

    afterAll(async () => {
        await app.stop()
        if (!nock.isDone()) {
            throw new Error('Nock is not done')
        }
    })

    const authorizationCode: AuthSchemaCode = AuthSchemaCode.Authorization

    describe(`Auth schema ${authorizationCode}`, () => {
        it('should return auth url', async () => {
            const headers = userSessionGenerator.getHeaders()

            const { processId, authMethods = [] } = await getAuthMethodsAction.handler({ params: { code: authorizationCode }, headers })

            const authMethod = authMethods[0]
            const authProvider: AuthMockProvider = authMethodMockFactory.getAuthProvider(authMethod)

            await authProvider.requestAuthorizationUrl()
            const { authUrl } = await authUrlAction.handler({
                params: { processId, target: authMethod, ...authProvider.getSpecificParams() },
                headers,
            })

            expect(authUrl).toEqual(expect.any(String))

            const steps = <UserAuthSteps>(<unknown>await userAuthStepsModel.findOneAndDelete({ mobileUid: headers.mobileUid }))

            expect(steps.status).toEqual(UserAuthStepsStatus.Processing)
        })

        it('should fail if wrong method was provided', async () => {
            const headers = userSessionGenerator.getHeaders()

            const { processId } = await getAuthMethodsAction.handler({ params: { code: authorizationCode }, headers })

            expect.assertions(2)
            try {
                await authUrlAction.handler({ params: { processId, target: AuthMethod.PhotoId }, headers })
            } catch (err) {
                utils.handleError(err, (error) => {
                    const errorCode = error.getData().processCode

                    if (!errorCode) {
                        throw new Error(`Test failed: unexpected error ${error}`)
                    }

                    expect(errorCode).toEqual(ProcessCode.WaitingPeriodHasExpired)
                })
            }

            const steps = <UserAuthSteps>(<unknown>await userAuthStepsModel.findOneAndDelete({ mobileUid: headers.mobileUid }))

            expect(steps.status).toEqual(UserAuthStepsStatus.Failure)
        })

        it('should fail if attempts limit is exceed', async () => {
            const headers = userSessionGenerator.getHeaders()

            const { processId, authMethods = [] } = await getAuthMethodsAction.handler({ params: { code: authorizationCode }, headers })

            const authSchema = await authSchemaModel.findOne({ code: authorizationCode })
            const authMethod = authMethods[0]
            const authProvider = authMethodMockFactory.getAuthProvider(authMethod)
            const retries = authSchema![authMethod]!.maxAttempts

            expect.assertions(3 + retries)
            for (let i = 0; i < retries; i += 1) {
                await authProvider.requestAuthorizationUrl()
                const { authUrl } = await authUrlAction.handler({
                    params: { processId, target: authMethod, ...authProvider.getSpecificParams() },
                    headers,
                })

                expect(authUrl).toEqual(expect.any(String))
            }

            const steps = await userAuthStepsModel.findOne({ mobileUid: headers.mobileUid })

            expect(steps!.status).toEqual(UserAuthStepsStatus.Processing)
            try {
                await authUrlAction.handler({
                    params: { processId, target: authMethod, ...authProvider.getSpecificParams() },
                    headers,
                })
            } catch (err) {
                utils.handleError(err, (error) => {
                    const errorCode = error.getData().processCode

                    if (!errorCode) {
                        throw new Error(`Test failed: unexpected error ${error}`)
                    }

                    expect(errorCode).toEqual(ProcessCode.AuthAttemptsExceeded)
                })
            }

            const deletedSteps = <UserAuthSteps>(<unknown>await userAuthStepsModel.findOneAndDelete({ mobileUid: headers.mobileUid }))

            expect(deletedSteps.status).toEqual(UserAuthStepsStatus.Failure)
        })

        it('should fail if another method is provided on the same step', async () => {
            const headers = userSessionGenerator.getHeaders()

            const { processId, authMethods = [] } = await getAuthMethodsAction.handler({ params: { code: authorizationCode }, headers })

            const authMethod: AuthMethod = authMethods[0]
            const authProvider: AuthMockProvider = authMethodMockFactory.getAuthProvider(authMethod)

            await authProvider.requestAuthorizationUrl()
            const { authUrl } = await authUrlAction.handler({
                params: { processId, target: authMethod, ...authProvider.getSpecificParams() },
                headers,
            })

            const steps = await userAuthStepsModel.findOne({ mobileUid: headers.mobileUid })

            expect.assertions(4)
            expect(steps!.status).toEqual(UserAuthStepsStatus.Processing)
            expect(authUrl).toEqual(expect.any(String))
            try {
                await authUrlAction.handler({ params: { processId, target: AuthMethod.PhotoId }, headers })
            } catch (err) {
                utils.handleError(err, (error) => {
                    const errorCode = error.getData().processCode

                    if (!errorCode) {
                        throw new Error(`Test failed: unexpected error ${error}`)
                    }

                    expect(errorCode).toEqual(ProcessCode.WaitingPeriodHasExpired)
                })
            }

            const deletedSteps = <UserAuthSteps>(<unknown>await userAuthStepsModel.findOneAndDelete({ mobileUid: headers.mobileUid }))

            expect(deletedSteps.status).toEqual(UserAuthStepsStatus.Failure)
        })
    })
})
