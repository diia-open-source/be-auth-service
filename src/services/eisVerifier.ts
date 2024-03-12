import { HttpError, ServiceUnavailableError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpService, HttpServiceResponse } from '@diia-inhouse/http'
import { ActHeaders, HttpStatusCode, Logger } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'

export default class EisUserApprovalVerificationService {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly httpsService: HttpService,
    ) {}

    private basicToken: string | undefined

    private readonly isEnabled: boolean = this.config.eis.isEnabled

    async verify(itn: string, headers: ActHeaders): Promise<void | HttpError> {
        if (!this.isEnabled) {
            return
        }

        this.logger.info('Start getting approve from EIS to log the user into application')
        const payload: Record<string, unknown> = {
            rnokpp: itn,
            date: new Date().toISOString(),
            traceId: headers.traceId,
        }

        const [err, response] = await this.makeApiCall(payload)
        if (err) {
            const message = 'Get approve from EIS: error'

            this.logger.error(message, { err })

            throw new UnauthorizedError(message)
        }

        this.logger.info('Get approve from EIS: result', {
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
        })

        if ([HttpStatusCode.SERVICE_UNAVAILABLE, HttpStatusCode.GATEWAY_TIMEOUT].includes(response.statusCode!)) {
            throw new ServiceUnavailableError()
        }

        if (![HttpStatusCode.OK, HttpStatusCode.ACCEPTED].includes(response.statusCode!)) {
            throw new UnauthorizedError()
        }
    }

    private makeApiCall(data: Record<string, unknown>): Promise<HttpServiceResponse> {
        return this.httpsService.post(
            {
                host: this.config.eis.host,
                port: this.config.eis.port,
                path: this.config.eis.agreeUrl,
                timeout: this.config.app.integrationPointsTimeout,
                headers: {
                    'Content-type': 'application/json',
                    Authorization: `Basic ${this.generateBasicToken()}`,
                },
                rejectUnauthorized: false,
            },
            undefined,
            JSON.stringify(data),
        )
    }

    private generateBasicToken(): string {
        if (!this.basicToken) {
            this.basicToken = Buffer.from(`${this.config.eis.username}:${this.config.eis.password}`).toString('base64')
        }

        return this.basicToken
    }
}
