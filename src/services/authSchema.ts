import { Cipher, createCipheriv, privateEncrypt, randomBytes } from 'crypto'
import { readFileSync } from 'fs'

import { compare as compareSemver } from 'compare-versions'
import { FilterQuery } from 'mongoose'

import { BadRequestError, InternalServerError, ModelNotFoundError } from '@diia-inhouse/errors'
import { I18nService } from '@diia-inhouse/i18n'
import { PlatformType } from '@diia-inhouse/types'

import authSchemaModel from '@models/authSchema'

import { AppConfig } from '@interfaces/config'
import { AuthSchemaCode, AuthSchemaModel, FldConfig } from '@interfaces/models/authSchema'
import {
    FaceLivenessDetectionConfigResponse,
    FaceLivenessDetectionConfigResponseValues,
    FaceLivenessDetectionVersion,
    GetFldConfigHeadersParams,
} from '@interfaces/services/authSchema'

export default class AuthSchemaService {
    constructor(
        private readonly config: AppConfig,
        private readonly i18nService: I18nService,
    ) {}

    private readonly authSchemaByCode: Map<AuthSchemaCode, AuthSchemaModel> = new Map()

    private readonly certFilePath: string = this.config.fld.certFilePath

    private readonly privateRsaKey: Buffer = readFileSync(this.certFilePath)

    async getByCode(code: AuthSchemaCode): Promise<AuthSchemaModel> {
        const cachedSchema = this.authSchemaByCode.get(code)
        if (cachedSchema) {
            return cachedSchema
        }

        const query: FilterQuery<AuthSchemaModel> = { code }
        const authSchema = await authSchemaModel.findOne(query)
        if (!authSchema) {
            throw new ModelNotFoundError(authSchemaModel.modelName, code)
        }

        this.authSchemaByCode.set(code, authSchema)

        return authSchema
    }

    async getFldConfig(
        authSchema: AuthSchemaModel,
        headers: GetFldConfigHeadersParams,
        isLowRamDevice = false,
        builtInTrueDepthCamera = false,
    ): Promise<FaceLivenessDetectionConfigResponse> {
        const { platformType, appVersion } = headers

        switch (platformType) {
            case PlatformType.Android:
            case PlatformType.Huawei: {
                if (isLowRamDevice) {
                    return { version: FaceLivenessDetectionVersion.V1 }
                }

                break
            }
            case PlatformType.iOS: {
                if (!builtInTrueDepthCamera) {
                    return { version: FaceLivenessDetectionVersion.V1 }
                }

                break
            }
            case PlatformType.Browser:
                break
            default: {
                const unhandledPlatform: never = platformType

                throw new TypeError(`Unhandled platform type: ${unhandledPlatform}`)
            }
        }

        const configsByPlatform: FldConfig[] = authSchema.toObject().faceLivenessDetectionConfig?.[platformType]
        if (!configsByPlatform?.length) {
            throw new InternalServerError(`Config could not be found for platform ${platformType}`)
        }

        const fldConfig = configsByPlatform.find(({ maxAppVersion }: FldConfig) => {
            if (!maxAppVersion) {
                return true
            }

            return compareSemver(appVersion, maxAppVersion, '<=')
        })
        if (!fldConfig) {
            throw new BadRequestError('Could not find config for the provided app')
        }

        if ('messages' in fldConfig.values && fldConfig.values.messages) {
            const messages = fldConfig.values.messages

            Object.entries<string>(messages).forEach(([key, value]) => {
                messages[key] = this.i18nService.get(value)
            })
        }

        return {
            version: FaceLivenessDetectionVersion.V2,
            config: await this.encodeFldConfig(fldConfig),
        }
    }

    private async encodeFldConfig(fldConfig: FldConfig): Promise<string> {
        const symKey: Buffer = randomBytes(32)
        const aesCipher: Cipher = createCipheriv('aes-256-ecb', symKey, null)
        const encodedKey: Buffer = privateEncrypt(this.privateRsaKey, symKey)

        const { values, version } = fldConfig
        const resultValues: FaceLivenessDetectionConfigResponseValues = { ...values, version }
        const encodedConfig: string = aesCipher.update(JSON.stringify(resultValues), 'utf8', 'base64') + aesCipher.final('base64')

        return `${encodedKey.toString('base64')}.${encodedConfig}`
    }
}
