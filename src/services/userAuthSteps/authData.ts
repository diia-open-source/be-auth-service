import { FilterQuery, UpdateQuery, UpdateWriteOpResult } from 'mongoose'

import { AccessDeniedError, ModelNotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import { Logger } from '@diia-inhouse/types'

import userAuthStepsModel from '@models/userAuthSteps'

import { AppConfig } from '@interfaces/config'
import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStepsModel } from '@interfaces/models/userAuthSteps'
import { AuthorizationDataParams } from '@interfaces/services/userAuthSteps'
import { GetTokenParams, GetUserTokenParams } from '@interfaces/services/userAuthToken'

export default class AuthDataService {
    constructor(
        private readonly config: AppConfig,
        private readonly cache: CacheService,
        private readonly logger: Logger,
    ) {}

    async getAuthorizationCacheData<T = GetUserTokenParams>(code: AuthSchemaCode, processId: string): Promise<T> {
        const key = this.getAuthorizationStrategyCacheKey(code, processId)
        try {
            const dataJson = await this.cache.get(key)
            if (!dataJson) {
                this.logger.error('Authorization process expired', { processId })

                throw new AccessDeniedError()
            }

            const data: T = JSON.parse(dataJson)

            return data
        } catch (err) {
            this.logger.error('Failed to get authorization cache data', { err, processId })

            throw err
        }
    }

    async saveAuthorizationData<T = GetTokenParams>(params: AuthorizationDataParams<T>): Promise<void> {
        const { code, processId, userIdentifier, tokenParams, attachUserIdentifier } = params
        const tasks: Promise<unknown>[] = [this.saveTokenParams<T>(code, processId, tokenParams)]

        if (attachUserIdentifier) {
            tasks.push(this.attachUserIdentifier(processId, userIdentifier))
        }

        await Promise.all(tasks)
    }

    private async saveTokenParams<T = GetTokenParams>(code: AuthSchemaCode, processId: string, tokenParams: T): Promise<void> {
        const cacheKey: string = this.getAuthorizationStrategyCacheKey(code, processId)
        const cacheTtl: number = this.getAuthorizationCacheTtlSec(code)

        await this.cache.set(cacheKey, JSON.stringify(tokenParams), cacheTtl)
    }

    private async attachUserIdentifier(processId: string, userIdentifier: string): Promise<void> {
        const query: FilterQuery<UserAuthStepsModel> = { processId }
        const modifier: UpdateQuery<UserAuthStepsModel> = { userIdentifier }

        const { modifiedCount }: UpdateWriteOpResult = await userAuthStepsModel.updateOne(query, modifier)
        if (modifiedCount !== 1) {
            throw new ModelNotFoundError(userAuthStepsModel.modelName, processId)
        }
    }

    private getAuthorizationCacheTtlSec(code: AuthSchemaCode): number {
        const authSchema = this.config.auth.schema.schemaMap[code]

        if (!authSchema) {
            return Math.floor(this.config.auth.schema.schemaMap[AuthSchemaCode.Authorization].tokenParamsCacheTtl / 1000)
        }

        return authSchema.tokenParamsCacheTtl / 1000
    }

    private getAuthorizationStrategyCacheKey(code: AuthSchemaCode, processId: string): string {
        return `user-auth-steps-${code}-${processId}`
    }
}
