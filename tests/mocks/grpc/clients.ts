import { GrpcClientFactory } from '@diia-inhouse/diia-app'

import { BankIdCryptoServiceDefinition, CryptoDocServiceDefinition } from '@diia-inhouse/diia-crypto-client'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { MetricsService } from '@diia-inhouse/diia-metrics'
import { mockInstance } from '@diia-inhouse/test'

const grpcClientFactory = new GrpcClientFactory('Auth', new DiiaLogger(), mockInstance(MetricsService))

export const cryptoDocServiceClient = grpcClientFactory.createGrpcClient(CryptoDocServiceDefinition, 'test', 'crypto')

export const bankIdCryptoServiceClient = grpcClientFactory.createGrpcClient(BankIdCryptoServiceDefinition, 'test', 'crypto')
