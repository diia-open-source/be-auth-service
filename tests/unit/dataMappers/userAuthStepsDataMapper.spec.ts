import { randomUUID } from 'node:crypto'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { BadRequestError } from '@diia-inhouse/errors'
import { mockInstance } from '@diia-inhouse/test'

import userAuthStepsModel from '@models/userAuthSteps'

import UserAuthStepsDataMapper from '@dataMappers/userAuthStepsDataMapper'

import { AuthMethod, AuthSchemaCode, AuthSchemaModel } from '@interfaces/models/authSchema'
import { UserAuthStepsModel, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'

describe('UserAuthStepsDataMapper', () => {
    const logger = mockInstance(DiiaLogger)
    const mapper = new UserAuthStepsDataMapper(logger)

    describe('method: `toAuthMethodsResponse`', () => {
        test('should map AuthSchema, AuthSteps, and AuthMethods to AuthMethodsResponse interface', () => {
            const mockAuthSchema: Partial<AuthSchemaModel> = {
                code: AuthSchemaCode.EResidentAuth,
                title: 'Mock Auth Schema',
                description: 'Description',
                methods: [AuthMethod.EResidentQrCode],
            }

            const mockAuthSteps: Partial<UserAuthStepsModel> = {
                code: AuthSchemaCode.EResidentAuth,
                mobileUid: randomUUID(),
                processId: 'process123',
                status: UserAuthStepsStatus.Processing,
                statusHistory: [
                    {
                        status: UserAuthStepsStatus.Processing,
                        date: new Date(),
                    },
                ],
                conditions: [],
                isRevoked: false,
            }

            const userAuthStepsInstance = new userAuthStepsModel(mockAuthSteps)

            const mockAuthMethods: AuthMethod[] = [AuthMethod.EResidentQrCode]

            const result = mapper.toAuthMethodsResponse(
                <AuthSchemaModel>mockAuthSchema,
                <UserAuthStepsModel>userAuthStepsInstance,
                mockAuthMethods,
            )

            expect(result).toEqual({
                processId: 'process123',
                title: 'Mock Auth Schema',
                description: 'Description',
                authMethods: mockAuthMethods,
                button: {
                    action: 'close',
                },
                skipAuthMethods: false,
                processCode: undefined,
            })
        })

        test('should throw BadRequestError for invalid method', () => {
            const startDate = new Date()
            const lastStep = {
                method: AuthMethod.BankId,
                attempts: 1,
                startDate,
                verifyAttempts: 1,
            }

            const authMethods: AuthMethod[] = [AuthMethod.Nfc]

            const mockAuthSchema = {
                code: 'schema123',
                title: 'Mock Auth Schema',
                description: 'Description',
                methods: [AuthMethod.EResidentQrCode],
            }

            const mockAuthSteps = {
                code: AuthSchemaCode.EResidentAuth,
                mobileUid: randomUUID(),
                processId: 'process123',
                status: UserAuthStepsStatus.Processing,
                steps: [
                    {
                        method: AuthMethod.BankId,
                        attempts: 1,
                        verifyAttempts: 1,
                        startDate,
                    },
                ],
                statusHistory: [
                    {
                        status: UserAuthStepsStatus.Processing,
                        date: new Date(),
                    },
                ],
                conditions: [],
                isRevoked: false,
            }

            const userAuthStepsInstance = new userAuthStepsModel(mockAuthSteps)

            const mockAuthMethods = [AuthMethod.Nfc]

            expect(() =>
                mapper.toAuthMethodsResponse(<AuthSchemaModel>mockAuthSchema, <UserAuthStepsModel>userAuthStepsInstance, mockAuthMethods),
            ).toThrow(BadRequestError)

            expect(logger.error).toHaveBeenCalledWith('Could not get auth method from the last step', { lastStep, authMethods })
        })

        test('should map AuthSchema, AuthSteps, and AuthMethods to AuthMethodsResponse interface with steps', () => {
            const mockAuthSchema = {
                code: AuthSchemaCode.EResidentAuth,
                title: 'Mock Auth Schema',
                description: 'Description',
                methods: [AuthMethod.EResidentQrCode],
            }

            const mockAuthSteps = {
                code: AuthSchemaCode.EResidentAuth,
                mobileUid: randomUUID(),
                processId: 'process123',
                status: UserAuthStepsStatus.Processing,
                statusHistory: [
                    {
                        status: UserAuthStepsStatus.Processing,
                        date: new Date(),
                    },
                ],
                steps: [
                    {
                        method: AuthMethod.EResidentQrCode,
                        attempts: 1,
                        verifyAttempts: 0,
                        startDate: new Date(),
                    },
                ],
                conditions: [],
                isRevoked: false,
            }

            const userAuthStepsInstance = new userAuthStepsModel(mockAuthSteps)

            const mockAuthMethods = [AuthMethod.EResidentQrCode]

            const result = mapper.toAuthMethodsResponse(
                <AuthSchemaModel>mockAuthSchema,
                <UserAuthStepsModel>userAuthStepsInstance,
                mockAuthMethods,
            )

            expect(result).toEqual({
                processId: 'process123',
                title: 'Mock Auth Schema',
                description: 'Description',
                authMethods: mockAuthMethods,
                button: {
                    action: 'close',
                },
                skipAuthMethods: false,
                processCode: undefined,
            })
        })
    })
})
