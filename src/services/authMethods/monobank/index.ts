import Endpoint from 'monobank-api-client/src/Endpoint'
import Signer from 'monobank-api-client/src/Signer'

import { BadRequestError, HttpError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpService, HttpServiceResponse, HttpServiceResponseResult } from '@diia-inhouse/http'
import { Logger } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'
import { AuthProviderFactory } from '@interfaces/services/authMethods'
import { MonoAuthHeaders, MonoHeaders, MonobankUserDTO } from '@interfaces/services/authMethods/monobank'

export default class MonobankProvider implements AuthProviderFactory {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly httpsService: HttpService,
    ) {
        this.serviceConfig = this.config.thirdParty.monobank
        if (!this.serviceConfig.isEnabled) {
            this.logger.info('Monobank provider disabled')

            return
        }

        this.signer = new Signer(config.thirdParty.monobank.pathToPrivateKey)
        this.logger.info('Monobank provider init')
    }

    readonly serviceConfig

    private readonly integrationPointsTimeout = this.config.app.integrationPointsTimeout

    private readonly signer: Signer | undefined

    async requestAuthorizationUrl(): Promise<string> {
        const [err, response]: HttpServiceResponse = await this.httpsService.post({
            host: this.serviceConfig.baseUrl,
            path: Endpoint.PERSONAL_AUTH_REQUEST,
            headers: this.getAuthHeaders({
                endpoint: Endpoint.PERSONAL_AUTH_REQUEST,
                permissions: [],
            }),
            rejectUnauthorized: false,
            timeout: this.integrationPointsTimeout,
        })

        if (err) {
            this.logger.error('Monobank request auth url fail', {
                error: err.message,
                err,
            })

            throw new HttpError(err.message, 500)
        }

        const {
            data: { acceptUrl },
        }: HttpServiceResponseResult = response

        this.logger.debug('Request Authorization Url', { acceptUrl })

        return acceptUrl
    }

    async verify(requestId: string): Promise<MonobankUserDTO> {
        this.logger.info('Monobank Auth: start')

        const [err, response] = await this.httpsService.get({
            host: this.serviceConfig.baseUrl,
            path: Endpoint.CLIENT_INFO,
            headers: this.getAuthHeaders({
                requestId,
                endpoint: Endpoint.CLIENT_INFO,
            }),
            rejectUnauthorized: false,
            timeout: this.integrationPointsTimeout,
        })

        if (err) {
            if (err.data) {
                switch (err.statusCode) {
                    case 404:
                    case 401:
                        throw new UnauthorizedError(err.data.errorDescription)
                    default:
                        throw new UnauthorizedError(`${JSON.stringify(err.data)} ${err.statusCode}`)
                }
            }

            throw new BadRequestError('Monobank Auth failed', { err })
        }

        this.logger.debug('Monobank auth result', response.data)
        this.logger.info('Monobank Auth: success')

        return response.data
    }

    private getAuthHeaders({ endpoint, requestId = undefined, permissions = [] }: MonoAuthHeaders): MonoHeaders {
        if (!this.signer) {
            throw new Error('Monobank provider is disabled')
        }

        const time: string = Math.floor(new Date().getTime() / 1000).toString()
        const baseHeaders: MonoHeaders = {
            'X-Key-Id': this.serviceConfig.APIToken,
            'X-Time': time,
        }

        switch (endpoint) {
            case Endpoint.PERSONAL_AUTH_REQUEST:
                return {
                    ...baseHeaders,
                    'X-Permissions': permissions.join(''),
                    'X-Sign': this.signer.sign(`${time}${permissions.join('')}${endpoint}`),
                }
            case Endpoint.CLIENT_INFO: {
                const headers: MonoHeaders = {
                    ...baseHeaders,
                    'X-Sign': this.signer.sign(`${time}${requestId}${endpoint}`),
                }

                if (requestId) {
                    headers['X-Request-Id'] = requestId
                }

                return headers
            }
            default:
                throw new BadRequestError('Invalid endpoint')
        }
    }
}
