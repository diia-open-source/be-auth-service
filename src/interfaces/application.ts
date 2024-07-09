import { AnalyticsService } from '@diia-inhouse/analytics'
import { CryptoDeps } from '@diia-inhouse/crypto'
import { BankIdCryptoServiceClient, CryptoDocServiceClient } from '@diia-inhouse/diia-crypto-client'
import { HttpDeps } from '@diia-inhouse/http'
import { I18nService } from '@diia-inhouse/i18n'

import { AppConfig } from './config'
import { ProvidersDeps } from './providers'

import Utils from '@src/utils'

export interface GrpcClientsDeps {
    bankIdCryptoServiceClient: BankIdCryptoServiceClient
    cryptoDocServiceClient: CryptoDocServiceClient
}

export type AppDeps = {
    config: AppConfig
    i18nService: I18nService
    analytics: AnalyticsService
    hash: CryptoDeps['hash']
    crypto: CryptoDeps['crypto']
    appUtils: Utils
} & HttpDeps &
    GrpcClientsDeps &
    ProvidersDeps

export enum InternalQueueName {
    QueueAuth = 'QueueAuth',
}

export enum ScheduledTaskQueueName {
    ScheduledTasksQueueAuth = 'ScheduledTasksQueueAuth',
}

export enum InternalEvent {
    AcquirersOfferRequestHasDeleted = 'acquirers-offer-request-has-deleted',
    AuthCreateOrUpdateUserProfile = 'auth-create-or-update-user-profile',
    AuthAssignUserToPushToken = 'auth-assign-user-to-push-token',
    AuthUserLogOut = 'auth-user-log-out',
    AuthCreateOrUpdateEResidentProfile = 'auth-create-or-update-eresident-profile',
    AuthAssignEResidentToPushToken = 'auth-assign-eresident-to-push-token',
    AuthEResidentLogOut = 'auth-eresident-log-out',
    GatewayUserActivity = 'gateway-user-activity',
    NotifyWithPushes = 'notify-with-pushes',
}

export enum ExternalEvent {
    AttestationGoogleDevice = 'attestation.google.device',
    AuthSaveNfcScanResult = 'auth.nfc.scan-result',
    IntegrityGoogleDevice = 'integrity.google.device',
    AttestationHuaweiDevice = 'attestation.huawei.device',
    FaceRecoAuthPhotoVerification = 'auth.photo.verification',
    RepoAuthEisAgree = 'eis.agree',
    EResidentAuthConfirmation = 'eresident.eresident-auth-confirmation',
    AuthGetInnByUnzr = 'auth.nfc.inn-by-unzr',
    FaceRecoAuthNfcUserPersist = 'auth.nfc.user.persist',
    EResidentDiiaIdCreation = 'eresident.eresident-diiaid-creation',
}

export enum InternalTopic {
    TopicAcquirersOfferRequestLifeCycle = 'TopicAcquirersOfferRequestLifeCycle',
    TopicGatewayUserActivity = 'TopicGatewayUserActivity',
    TopicScheduledTasks = 'TopicScheduledTasks',
    TopicAuthUserSession = 'TopicAuthUserSession',
    TopicSendNotificationPushes = 'TopicUserSendNotificationPushes',
}

export enum ExternalTopic {
    Auth = 'Auth',
    Attestation = 'Attestation',
    EResident = 'EResident',
    FaceReco = 'FaceReco',
    Repo = 'Repo',
}

export enum ScheduledTaskEvent {
    AuthCheckRefreshTokensExpiration = 'auth-check-refresh-tokens-expiration',
    AuthUpdateBankIdBankList = 'auth-update-bank-id-bank-list',
}
