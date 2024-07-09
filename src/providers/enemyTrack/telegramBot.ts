import * as qs from 'node:querystring'

import { ServiceUnavailableError } from '@diia-inhouse/errors'
import { HttpService, HttpServiceResponse, HttpServiceResponseResult } from '@diia-inhouse/http'
import { HttpStatusCode, Logger } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'
import { QueryParams } from '@interfaces/providers/enemyTrack/telegramBot'

export default class EnemyTrackTelegramBotService {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly httpsService: HttpService,
    ) {
        this.host = this.config.enemyTrack.telegramBot.host
        this.authId = this.config.enemyTrack.telegramBot.authId
    }

    private readonly host

    private readonly authId

    async sendLink(link: string): Promise<void> {
        const params: QueryParams = { action: 'getQRcode', link }
        const querystring: string = qs.stringify(params)

        await this.requestResource(`/?${querystring}`)
    }

    private async requestResource<T>(path: string): Promise<T> | never {
        const [error, response = {}]: HttpServiceResponse = await this.makeApiCall(path)
        if (error || response?.statusCode !== HttpStatusCode.OK) {
            const errorResponse: HttpServiceResponseResult = error || response
            const errorMsg = 'Failed to make telegram bot api call'

            this.logger.error(errorMsg, errorResponse)

            throw new ServiceUnavailableError(errorMsg)
        }

        return response.data
    }

    private async makeApiCall(path: string): Promise<HttpServiceResponse> {
        this.logger.info('Start calling enemy track telegram bot', { path })

        return await this.httpsService.post({
            host: this.host,
            path,
            headers: {
                'App-Auth-Id': this.authId,
            },
            rejectUnauthorized: false,
            timeout: this.config.app.integrationPointsTimeout,
        })
    }
}
