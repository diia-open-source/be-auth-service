import { GrpcService } from '@diia-inhouse/diia-app'

import { AnalyticsService } from '@diia-inhouse/analytics'
import { CryptoDeps } from '@diia-inhouse/crypto'
import { DatabaseService } from '@diia-inhouse/db'
import { BankIdCryptoServiceClient, CryptoDocServiceClient } from '@diia-inhouse/diia-crypto-client'
import { ExternalCommunicatorChannel, QueueDeps } from '@diia-inhouse/diia-queue'
import { HealthCheck } from '@diia-inhouse/healthcheck'
import { HttpDeps } from '@diia-inhouse/http'
import { I18nService } from '@diia-inhouse/i18n'
import { RedisDeps } from '@diia-inhouse/redis'

import Utils from '@src/utils'

import { AppConfig } from '@interfaces/config'

export type InternalDeps = {
    appUtils: Utils
}

export interface GrpcClientsDeps {
    bankIdCryptoServiceClient: BankIdCryptoServiceClient
    cryptoDocServiceClient: CryptoDocServiceClient
}

export type AppDeps = {
    config: AppConfig
    healthCheck: HealthCheck
    database: DatabaseService
    i18nService: I18nService
    externalChannel: ExternalCommunicatorChannel
    analytics: AnalyticsService
    grpcService: GrpcService
} & InternalDeps &
    QueueDeps &
    RedisDeps &
    HttpDeps &
    Required<CryptoDeps> &
    GrpcClientsDeps
