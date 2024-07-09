import * as crypto from 'node:crypto'

import { HttpError, InternalServerError, ServiceUnavailableError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpService, HttpServiceResponse } from '@diia-inhouse/http'
import { Logger } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'
import { AuthProviderFactory } from '@interfaces/services/authMethods'
import { PrivatBankUserDTO, PrivatbankConfig } from '@interfaces/services/authMethods/privatBank'

export default class PrivatBankProvider implements AuthProviderFactory {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly httpsService: HttpService,
    ) {
        this.serviceConfig = this.config.thirdParty.privatbank
        this.integrationPointsTimeout = this.config.app.integrationPointsTimeout
    }

    readonly serviceConfig: PrivatbankConfig

    private readonly integrationPointsTimeout: number

    async requestAuthorizationUrl(): Promise<string> {
        const authPayload: Record<string, unknown> = this.getPayload('create_sid')
        const path: string = this.buildRequestURl(this.serviceConfig, JSON.stringify(authPayload))

        this.logger.info('Requesting Privatbank Authorization Url', {
            authPayload,
            path,
        })

        const [err, response = {}]: HttpServiceResponse = await this.makeApiCall(path, authPayload)

        if (err) {
            this.logger.error('PrivatBank request auth url fail', { err })
            if (err.data) {
                throw new UnauthorizedError(err.data)
            }

            throw new UnauthorizedError()
        }

        if (response.data.result === 'error') {
            this.logger.error('PrivatBank request auth url fail. Please check the correctness of Resource URI', response.data)

            throw new InternalServerError()
        }

        this.logger.info('Privatbank Authorization Url received successfully')
        this.logger.debug('Privatbank Authorization Url', response.data)

        return this.createAuthUrl(response.data.sid)
    }

    async verify(requestId: string): Promise<PrivatBankUserDTO> | never {
        const authPayload: Record<string, unknown> = this.getPayload('get_user_data', { sid: requestId })
        const path: string = this.buildRequestURl(this.serviceConfig, JSON.stringify(authPayload))

        this.logger.info('Privatbank Auth: start')
        this.logger.info('Requesting Privatbank user data', {
            authPayload,
            path,
        })

        const [err, response = {}]: HttpServiceResponse = await this.makeApiCall(path, authPayload)

        // TODO(BACK-0): we need to handle error
        if (err) {
            if (err.data) {
                this.logger.error('PrivatBank user auth fail', {
                    error: err.data,
                })

                throw new HttpError(err.data, err.statusCode)
            } else {
                throw new ServiceUnavailableError()
            }
        }

        if (response.data.result === 'error') {
            this.logger.error('PrivatBank user auth fail', response.data)
            throw new UnauthorizedError()
        }

        this.logger.info('Privatbank Auth: success')
        this.logger.debug('Privatbank auth result', response.data.userData)

        return response.data.userData
    }

    private buildRequestURl({ version, account, secret }: PrivatbankConfig, content: string): string {
        const shasum: crypto.Hash = crypto.createHash('sha1')
        const unixTimeStamp: number = Date.now()

        // hex( sha1({TIME} + {ACCOUNT_SECRET} + {CONTENT} + {ACCOUNT_SECRET}),
        const signature: string = shasum.update(`${unixTimeStamp}${secret}${content}${secret}`).digest('hex')

        return `/api/${version}/json/${account}/${unixTimeStamp}/${signature}`
    }

    private createAuthUrl(sid: string): string {
        return `https://www.privat24.ua/rd/send_qr/diia_auth/${sid}`
    }

    private getPayload(cmd: string, params: Record<string, unknown> = {}): Record<string, unknown> {
        return { cmd, ...params }
    }

    private async makeApiCall(path: string, payload: Record<string, unknown>): Promise<HttpServiceResponse> {
        // const fingerprint: string = await App.fingerprint.getForHost(this.config.baseUrl);
        const fingerprint = undefined

        return await this.httpsService.post(
            {
                path,
                host: this.serviceConfig.baseUrl,
                rejectUnauthorized: false,
                timeout: this.integrationPointsTimeout,
            },
            fingerprint,
            JSON.stringify(payload),
        )
    }
}
