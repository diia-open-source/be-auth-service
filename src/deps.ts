import { asClass, asFunction } from 'awilix'

import { DepsFactoryFn, GrpcClientFactory, NameAndRegistrationPair } from '@diia-inhouse/diia-app'

import { AnalyticsService } from '@diia-inhouse/analytics'
import { CryptoService, HashService } from '@diia-inhouse/crypto'
import { BankIdCryptoServiceDefinition, CryptoDocServiceDefinition } from '@diia-inhouse/diia-crypto-client'
import { HttpService } from '@diia-inhouse/http'
import { I18nService } from '@diia-inhouse/i18n'
import { HttpProtocol } from '@diia-inhouse/types'

import Utils from './utils'

import { getProvidersDeps } from '@providers/index'

import { AppDeps, GrpcClientsDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export default async (config: AppConfig): ReturnType<DepsFactoryFn<AppConfig, AppDeps>> => {
    const providersDeps = getProvidersDeps()

    const grpcClientsDeps: NameAndRegistrationPair<GrpcClientsDeps> = {
        bankIdCryptoServiceClient: asFunction((grpcClientFactory: GrpcClientFactory) =>
            grpcClientFactory.createGrpcClient(BankIdCryptoServiceDefinition, config.grpc.bankIdCryptoServiceAddress),
        ).singleton(),
        cryptoDocServiceClient: asFunction((grpcClientFactory: GrpcClientFactory) =>
            grpcClientFactory.createGrpcClient(CryptoDocServiceDefinition, config.grpc.cryptoDocServiceAddress),
        ).singleton(),
    }

    return {
        i18nService: asClass(I18nService).singleton(),
        analytics: asClass(AnalyticsService).singleton(),
        appUtils: asClass(Utils).singleton(),
        hash: asClass(HashService).singleton(),
        crypto: asClass(CryptoService).singleton(),
        httpService: asClass(HttpService, { injector: () => ({ protocol: HttpProtocol.Http }) }).singleton(),
        httpsService: asClass(HttpService, { injector: () => ({ protocol: HttpProtocol.Https }) }).singleton(),

        ...providersDeps,
        ...grpcClientsDeps,
    }
}
