import { randomUUID } from 'node:crypto'
import fs from 'node:fs'

import { BadRequestError, InternalServerError, ModelNotFoundError } from '@diia-inhouse/errors'
import { I18nService } from '@diia-inhouse/i18n'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { Gender, PlatformType } from '@diia-inhouse/types'

import AuthSchemaService from '@services/authSchema'

import authSchemaModel from '@models/authSchema'

import { AppConfig } from '@interfaces/config'
import { AuthSchemaCode, FldConfigValues, FldConfigVersion, FldIosConfig } from '@interfaces/models/authSchema'
import { FaceLivenessDetectionVersion } from '@interfaces/services/authSchema'

jest.mock('node:crypto', () => {
    const original = jest.requireActual('crypto')

    return {
        ...original,
        privateEncrypt: (): string => 'test',
    }
})

describe(`${AuthSchemaService.name}`, () => {
    const testKit = new TestKit()
    const testItn = testKit.session.generateItn('24.08.1991', Gender.female, true)
    const i18nServiceMock = mockInstance(I18nService<string>)
    const config = <AppConfig>(<unknown>{
        applicationStoreReview: {
            testItn,
        },
        auth: {
            jwk: randomUUID(),
            jwt: {
                privateKey: randomUUID(),
                publicKey: randomUUID(),
                tokenSignOptions: {
                    algorithm: 'SHA256',
                    expiresIn: '30m',
                },
                tokenVerifyOptions: {
                    algorithms: ['SHA256'],
                    ignoreExpiration: false,
                },
            },
        },
        authService: { testAuthByItnIsEnabled: true },
        fld: {
            certFilePath: 'secrets/fld-config.key',
        },
    })

    jest.spyOn(fs, 'readFileSync').mockReturnValue('mock-file-content')
    const authSchemaService = new AuthSchemaService(config, i18nServiceMock)

    describe(`method: getByCode`, () => {
        it('should throw ModelNotFoundError if auth schema model is not found', async () => {
            jest.spyOn(authSchemaModel, 'findOne').mockResolvedValue(null)

            const code = AuthSchemaCode.Authorization

            const expectedError = new ModelNotFoundError(authSchemaModel.modelName, code)

            await expect(authSchemaService.getByCode(code)).rejects.toThrow(expectedError)
        })

        it('should get cached value', async () => {
            const mockAuthSchema = {
                code: AuthSchemaCode.Authorization,
            }

            jest.spyOn(authSchemaModel, 'findOne').mockResolvedValue(mockAuthSchema)

            const code = AuthSchemaCode.Authorization

            const result = await authSchemaService.getByCode(code)

            await authSchemaService.getByCode(code)

            expect(authSchemaModel.findOne).toHaveBeenCalledTimes(1)

            expect(result).toMatchObject(mockAuthSchema)
        })
    })

    describe(`method: getFldConfig`, () => {
        const mockAuthSchema = {
            code: AuthSchemaCode.Authorization,
            faceLivenessDetectionConfig: {
                [PlatformType.Android]: [{ maxAppVersion: '2.0.0', version: FldConfigVersion['v1.0'], values: <FldConfigValues>{} }],
                [PlatformType.iOS]: [
                    {
                        version: FldConfigVersion['v1.0'],
                        values: <Partial<FldIosConfig>>{
                            messages: { greeting: 'greeting-message' },
                        },
                    },
                    {
                        maxAppVersion: '2.0.0',
                        version: FldConfigVersion['v1.0'],
                        values: <Partial<FldIosConfig>>{
                            messages: { greeting: 'greeting-message' },
                        },
                    },
                ],
            },
        }

        it('should return V1 config for Android with isLowRamDevice', async () => {
            const headers = {
                platformType: PlatformType.Android,
                appVersion: '1.0.0',
            }

            const auth = new authSchemaModel(mockAuthSchema)
            const result = await authSchemaService.getFldConfig(auth, headers, true)

            expect(result.version).toBe(FaceLivenessDetectionVersion.V1)
        })

        it('should return V1 config for iOS without builtInTrueDepthCamera', async () => {
            const headers = {
                platformType: PlatformType.iOS,
                appVersion: '1.0.0',
            }
            const auth = new authSchemaModel(mockAuthSchema)
            const result = await authSchemaService.getFldConfig(auth, headers, false, false)

            expect(result.version).toBe(FaceLivenessDetectionVersion.V1)
        })

        it('should return V2 config for iOS with builtInTrueDepthCamera', async () => {
            const headers = {
                platformType: PlatformType.iOS,
                appVersion: '1.0.0',
            }
            const auth = new authSchemaModel(mockAuthSchema)

            jest.spyOn(i18nServiceMock, 'get').mockReturnValue('value')

            const result = await authSchemaService.getFldConfig(auth, headers, false, true)

            expect(result.version).toBe(FaceLivenessDetectionVersion.V2)
        })

        it('should throw TypeError if no config is found for the platform type', async () => {
            const headers = {
                platformType: <PlatformType>'Unknown',
                appVersion: '1.0.0',
            }
            const auth = new authSchemaModel(mockAuthSchema)

            const error = new TypeError(`Unhandled platform type: ${headers.platformType}`)

            await expect(authSchemaService.getFldConfig(auth, headers)).rejects.toThrow(error)
        })

        it('should throw InternalServerError if config is empty for the platform', async () => {
            const headers = {
                platformType: PlatformType.Browser,
                appVersion: '1.0.0',
            }

            const auth = new authSchemaModel(mockAuthSchema)

            await expect(authSchemaService.getFldConfig(auth, headers)).rejects.toThrow(InternalServerError)
        })

        it('should throw BadRequestError if no matching config is found for appVersion', async () => {
            const headers = {
                platformType: PlatformType.Android,
                appVersion: '5.0.0',
            }

            const auth = new authSchemaModel(mockAuthSchema)

            await expect(authSchemaService.getFldConfig(auth, headers)).rejects.toThrow(BadRequestError)
        })
    })
})
