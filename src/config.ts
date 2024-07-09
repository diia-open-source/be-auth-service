import { BaseConfig } from '@diia-inhouse/diia-app'

import { QueueConfigType, QueueConnectionType } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { RedisOptions } from '@diia-inhouse/redis'

import {
    ExternalEvent,
    ExternalTopic,
    InternalEvent,
    InternalQueueName,
    InternalTopic,
    ScheduledTaskEvent,
    ScheduledTaskQueueName,
} from '@interfaces/application'
import { AuthSchemaMap } from '@interfaces/config'
import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { BankIdConfig, BankIdDataset, BankIdVersion } from '@interfaces/services/bank'

const signAlgorithm = 'RS256'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async (envService: EnvService, serviceName: string) =>
    ({
        isMoleculerEnabled: true,

        transporter: {
            type: envService.getVar('TRANSPORT_TYPE'),
            options: envService.getVar('TRANSPORT_OPTIONS', 'object', {}),
        },

        balancing: {
            strategy: envService.getVar('BALANCING_STRATEGY_NAME'),
            strategyOptions: envService.getVar('BALANCING_STRATEGY_OPTIONS', 'object', {}),
        },

        db: {
            database: envService.getVar('MONGO_DATABASE'),
            replicaSet: envService.getVar('MONGO_REPLICA_SET'),
            user: await envService.getSecret('MONGO_USER', { accessor: 'username', nullable: true }),
            password: await envService.getSecret('MONGO_PASSWORD', { accessor: 'password', nullable: true }),
            authSource: envService.getVar('MONGO_AUTH_SOURCE', 'string', null),
            port: envService.getVar('MONGO_PORT', 'number'),
            replicaSetNodes: envService
                .getVar('MONGO_HOSTS', 'string')
                .split(',')
                .map((replicaHost: string) => ({ replicaHost })),
            readPreference: envService.getVar('MONGO_READ_PREFERENCE'),
            indexes: {
                sync: envService.getVar('MONGO_INDEXES_SYNC', 'boolean'),
                exitAfterSync: envService.getVar('MONGO_INDEXES_EXIT_AFTER_SYNC', 'boolean'),
            },
        },

        redis: {
            readWrite: <RedisOptions>envService.getVar('REDIS_READ_WRITE_OPTIONS', 'object'),
            readOnly: <RedisOptions>envService.getVar('REDIS_READ_ONLY_OPTIONS', 'object'),
        },

        store: {
            readWrite: <RedisOptions>envService.getVar('STORE_READ_WRITE_OPTIONS', 'object'),
            readOnly: <RedisOptions>envService.getVar('STORE_READ_ONLY_OPTIONS', 'object'),
        },

        rabbit: {
            serviceRulesConfig: {
                portalEvents: [],
                internalEvents: Object.values(InternalEvent),
                queuesConfig: {
                    [QueueConfigType.Internal]: {
                        [InternalQueueName.QueueAuth]: {
                            topics: [InternalTopic.TopicAcquirersOfferRequestLifeCycle, InternalTopic.TopicGatewayUserActivity],
                        },
                        [ScheduledTaskQueueName.ScheduledTasksQueueAuth]: {
                            topics: [InternalTopic.TopicScheduledTasks],
                        },
                    },
                },
                servicesConfig: {
                    [QueueConfigType.Internal]: {
                        subscribe: [ScheduledTaskQueueName.ScheduledTasksQueueAuth, InternalQueueName.QueueAuth],
                        publish: [InternalTopic.TopicAuthUserSession, InternalTopic.TopicSendNotificationPushes],
                    },
                    [QueueConfigType.External]: {
                        subscribe: [ExternalEvent.AuthSaveNfcScanResult],
                        publish: [
                            ExternalEvent.AttestationGoogleDevice,
                            ExternalEvent.IntegrityGoogleDevice,
                            ExternalEvent.AttestationHuaweiDevice,
                            ExternalEvent.FaceRecoAuthPhotoVerification,
                            ExternalEvent.RepoAuthEisAgree,
                            ExternalEvent.EResidentAuthConfirmation,
                            ExternalEvent.AuthGetInnByUnzr,
                            ExternalEvent.FaceRecoAuthNfcUserPersist,
                        ],
                    },
                },
                topicsConfig: {
                    [QueueConfigType.Internal]: {
                        [InternalTopic.TopicScheduledTasks]: {
                            events: Object.values(ScheduledTaskEvent),
                        },
                        [InternalTopic.TopicAuthUserSession]: {
                            events: [
                                InternalEvent.AuthCreateOrUpdateUserProfile,
                                InternalEvent.AuthAssignUserToPushToken,
                                InternalEvent.AuthUserLogOut,
                                InternalEvent.AuthCreateOrUpdateEResidentProfile,
                                InternalEvent.AuthAssignEResidentToPushToken,
                                InternalEvent.AuthEResidentLogOut,
                            ],
                        },
                        [InternalTopic.TopicAcquirersOfferRequestLifeCycle]: {
                            events: [InternalEvent.AcquirersOfferRequestHasDeleted],
                        },
                        [InternalTopic.TopicGatewayUserActivity]: {
                            events: [InternalEvent.GatewayUserActivity],
                        },
                        [InternalTopic.TopicSendNotificationPushes]: {
                            events: [InternalEvent.NotifyWithPushes],
                        },
                    },
                    [QueueConfigType.External]: {
                        [ExternalTopic.Auth]: {
                            events: [ExternalEvent.AuthSaveNfcScanResult, ExternalEvent.AuthGetInnByUnzr],
                        },
                        [ExternalTopic.EResident]: {
                            events: [ExternalEvent.EResidentAuthConfirmation],
                        },
                        [ExternalTopic.Attestation]: {
                            events: [
                                ExternalEvent.AttestationGoogleDevice,
                                ExternalEvent.IntegrityGoogleDevice,
                                ExternalEvent.AttestationHuaweiDevice,
                            ],
                        },
                        [ExternalTopic.FaceReco]: {
                            events: [ExternalEvent.FaceRecoAuthPhotoVerification, ExternalEvent.FaceRecoAuthNfcUserPersist],
                        },
                        [ExternalTopic.Repo]: {
                            events: [ExternalEvent.RepoAuthEisAgree],
                        },
                    },
                },
            },
            [QueueConnectionType.Internal]: {
                connection: {
                    hostname: envService.getVar('RABBIT_HOST'),
                    port: envService.getVar('RABBIT_PORT', 'number'),
                    username: await envService.getSecret('RABBIT_USERNAME', { accessor: 'username' }),
                    password: await envService.getSecret('RABBIT_PASSWORD', { accessor: 'password' }),
                    heartbeat: envService.getVar('RABBIT_HEARTBEAT', 'number'),
                },
                socketOptions: {
                    clientProperties: {
                        applicationName: `${serviceName} Service`,
                    },
                },
                reconnectOptions: {
                    reconnectEnabled: true,
                },
                listenerOptions: {
                    prefetchCount: envService.getVar('RABBIT_QUEUE_PREFETCH_COUNT', 'number', 10),
                },
                queueName: InternalQueueName.QueueAuth,
                scheduledTaskQueueName: ScheduledTaskQueueName.ScheduledTasksQueueAuth,
            },
            [QueueConnectionType.External]: {
                connection: {
                    hostname: envService.getVar('EXTERNAL_RABBIT_HOST'),
                    port: envService.getVar('EXTERNAL_RABBIT_PORT', 'number'),
                    username: await envService.getSecret('EXTERNAL_RABBIT_USERNAME', { accessor: 'username' }),
                    password: await envService.getSecret('EXTERNAL_RABBIT_PASSWORD', { accessor: 'password' }),
                    heartbeat: envService.getVar('EXTERNAL_RABBIT_HEARTBEAT', 'number'),
                },
                socketOptions: {
                    clientProperties: {
                        applicationName: `${serviceName} Service`,
                    },
                },
                reconnectOptions: {
                    reconnectEnabled: true,
                },
                listenerOptions: {
                    prefetchCount: envService.getVar('EXTERNAL_RABBIT_QUEUE_PREFETCH_COUNT', 'number', 1),
                },
                assertExchanges: envService.getVar('EXTERNAL_RABBIT_ASSERT_EXCHANGES', 'boolean', false),
            },
        },

        app: {
            integrationPointsTimeout: envService.getVar('INTEGRATION_TIMEOUT_IN_MSEC', 'number', 10 * 1000),
            externalBusTimeout: envService.getVar('EXTERNAL_BUS_TIMEOUT', 'number', 5 * 1000),
        },

        identifier: {
            salt: await envService.getSecret('SALT'),
        },

        healthCheck: {
            isEnabled: envService.getVar('HEALTH_CHECK_IS_ENABLED', 'boolean'),
            port: envService.getVar('HEALTH_CHECK_IS_PORT', 'number', 3000),
        },

        metrics: {
            moleculer: {
                prometheus: {
                    isEnabled: envService.getVar('METRICS_MOLECULER_PROMETHEUS_IS_ENABLED', 'boolean', true),
                    port: envService.getVar('METRICS_MOLECULER_PROMETHEUS_PORT', 'number', 3031),
                    path: envService.getVar('METRICS_MOLECULER_PROMETHEUS_PATH', 'string', '/metrics'),
                },
            },
            custom: {
                disabled: envService.getVar('METRICS_CUSTOM_DISABLED', 'boolean', false),
                port: envService.getVar('METRICS_CUSTOM_PORT', 'number', 3030),
                moleculer: {
                    disabled: envService.getVar('METRICS_CUSTOM_MOLECULER_DISABLED', 'boolean', false),
                    port: envService.getVar('METRICS_CUSTOM_MOLECULER_PORT', 'number', 3031),
                    path: envService.getVar('METRICS_CUSTOM_MOLECULER_PATH', 'string', '/metrics'),
                },
                disableDefaultMetrics: envService.getVar('METRICS_CUSTOM_DISABLE_DEFAULT_METRICS', 'boolean', false),
                defaultLabels: envService.getVar('METRICS_CUSTOM_DEFAULT_LABELS', 'object', {}),
            },
        },

        tracing: {
            zipkin: {
                isEnabled: envService.getVar('ZIPKIN_IS_ENABLED', 'boolean'),
                baseURL: envService.getVar('ZIPKIN_URL'),
                sendIntervalSec: envService.getVar('ZIPKIN_SEND_INTERVAL_SEC', 'number'),
            },
        },

        grpc: {
            bankIdCryptoServiceAddress: envService.getVar('GRPC_BANK_ID_CRYPTO_SERVICE_ADDRESS'),
            cryptoDocServiceAddress: envService.getVar('GRPC_CRYPTO_DOC_SERVICE_ADDRESS'),
        },

        grpcServer: {
            isEnabled: envService.getVar('GRPC_SERVER_ENABLED', 'boolean', false),
            port: envService.getVar('GRPC_SERVER_PORT', 'number', 5000),
            services: envService.getVar('GRPC_SERVICES', 'object'),
            isReflectionEnabled: envService.getVar('GRPC_REFLECTION_ENABLED', 'boolean', false),
            maxReceiveMessageLength: envService.getVar('GRPC_SERVER_MAX_RECEIVE_MESSAGE_LENGTH', 'number', 1024 * 1024 * 4),
        },

        thirdParty: {
            monobank: {
                isEnabled: process.env.AUTH_MONOBANK_IS_ENABLED === 'true',
                baseUrl: envService.getVar('AUTH_MONOBANK_BASE_URL', 'string', 'api.monobank.ua'),
                APIToken: await envService.getSecret('AUTH_MONOBANK_API_TOKEN'),
                pathToPrivateKey: envService.getVar('AUTH_MONOBANK_PRIVATE_KEY_PATH'),
            },
            privatbank: {
                baseUrl: envService.getVar('AUTH_PRIVATBANK_BASE_URL'),
                version: '1',
                account: await envService.getSecret('AUTH_PRIVATBANK_ACCOUNT'),
                secret: await envService.getSecret('AUTH_PRIVATBANK_ACCOUNT_SECRET'),
            },
        },

        eis: {
            isEnabled: process.env.EIS_IS_ENABLED === 'true',
            host: process.env.EIS_API_HOST,
            port: process.env.EIS_API_PORT,
            username: await envService.getSecret('EIS_AUTH_USERNAME'),
            password: await envService.getSecret('EIS_AUTH_PASSWORD'),
            agreeUrl: process.env.EIS_AGREE_URL,
        },

        auth: {
            jwt: {
                tokenVerifyOptions: {
                    algorithms: [signAlgorithm],
                    ignoreExpiration: true,
                },
                tokenSignOptions: {
                    algorithm: signAlgorithm,
                    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
                },
                privateKey: await envService.getSecret('JWE_SECRET_TOKEN_PRIVATE_KEY'),
                publicKey: await envService.getSecret('JWE_SECRET_TOKEN_PUBLIC_KEY'),
            },
            jwk: await envService.getSecret('JWE_SECRET_DATA_JWK'),
        },

        authService: {
            temporaryTokenSignOptions: {
                algorithm: signAlgorithm,
                expiresIn: process.env.TEMPORARY_JWT_EXPIRES_IN || '1m',
                audience: process.env.TEMPORARY_JWT_AUDIENCE,
                issuer: process.env.TEMPORARY_JWT_ISSUER,
            },
            isCustomRefreshTokenExpirationEnabled: envService.getVar('AUTH_SCHEMA_IS_CUSTOM_REFRESH_TOKEN_EXPIRATION_ENABLED', 'boolean'),
            testAuthByItnIsEnabled: process.env.TEST_AUTH_BY_ITN_IS_ENABLED === 'true',
            checkingForValidItnIsEnabled: process.env.CHECKING_FOR_VALID_ITN_IS_ENABLED === 'true',
            refreshTokenLifetime: process.env.JWT_REFRESH_EXPIRES_IN
                ? Number.parseInt(process.env.JWT_REFRESH_EXPIRES_IN, 10)
                : 30 * 24 * 60 * 60 * 1000,
            partnerRefreshTokenLifetime: process.env.JWT_PARTNER_REFRESH_EXPIRES_IN
                ? Number.parseInt(process.env.JWT_PARTNER_REFRESH_EXPIRES_IN, 10)
                : 2 * 60 * 60 * 1000,
            acquirerRefreshTokenLifetime: process.env.JWT_ACQUIRER_REFRESH_EXPIRES_IN
                ? Number.parseInt(process.env.JWT_ACQUIRER_REFRESH_EXPIRES_IN, 10)
                : 2 * 60 * 60 * 1000,
            cabinetTokenExpiresIn: process.env.JWT_CABINET_EXPIRES_IN || '30m',
            cabinetRefreshTokenLifetime: process.env.JWT_CABINET_REFRESH_EXPIRES_IN
                ? Number.parseInt(process.env.JWT_CABINET_REFRESH_EXPIRES_IN, 10)
                : 30 * 60 * 1000,
            tokenCacheDurationInSec: process.env.TOKEN_CACHE_DURATION_IN_SEC
                ? Number.parseInt(process.env.TOKEN_CACHE_DURATION_IN_SEC, 10)
                : 2 * 60 * 60,
            cabinetTokenCacheDurationInSec: process.env.TOKEN_CACHE_DURATION_IN_SEC
                ? Number.parseInt(process.env.TOKEN_CACHE_DURATION_IN_SEC, 10)
                : 30 * 60,
            refreshTokenExpirationsArchiveThresholdMs: process.env.REFRESH_TOKEN_EXPIRATIONS_ARCHIVE_THRESHOLD_MS
                ? Number.parseInt(process.env.REFRESH_TOKEN_EXPIRATIONS_ARCHIVE_THRESHOLD_MS, 10)
                : 7776000000,
            schema: {
                comparingItnIsEnabled: process.env.AUTH_SCHEMA_COMPARING_ITN_IS_ENABLED === 'true',
                admissionStepsTtl: process.env.AUTH_ADMISSION_STEPS_TTL
                    ? Number.parseInt(process.env.AUTH_ADMISSION_STEPS_TTL, 10)
                    : 180000,
                schemaMap: <AuthSchemaMap>{
                    [AuthSchemaCode.Authorization]: {
                        tokenParamsCacheTtl: process.env.AUTH_SCHEMA_AUTHORIZATION_TOKEN_PARAMS_CACHE_TTL
                            ? Number.parseInt(process.env.AUTH_SCHEMA_AUTHORIZATION_TOKEN_PARAMS_CACHE_TTL, 10)
                            : 60000,
                    },
                    [AuthSchemaCode.EResidentFirstAuth]: {
                        tokenParamsCacheTtl: process.env.AUTH_SCHEMA_ERESIDENT_FIRST_AUTH_TOKEN_PARAMS_CACHE_TTL
                            ? Number.parseInt(process.env.AUTH_SCHEMA_ERESIDENT_FIRST_AUTH_TOKEN_PARAMS_CACHE_TTL, 10)
                            : 300000,
                    },
                    [AuthSchemaCode.EResidentAuth]: {
                        tokenParamsCacheTtl: process.env.AUTH_SCHEMA_ERESIDENT_AUTH_TOKEN_PARAMS_CACHE_TTL
                            ? Number.parseInt(process.env.AUTH_SCHEMA_ERESIDENT_AUTH_TOKEN_PARAMS_CACHE_TTL, 10)
                            : 300000,
                    },
                    [AuthSchemaCode.CabinetAuthorization]: {
                        nonceCacheTtl: process.env.AUTH_SCHEMA_CABINET_AUTHORIZATION_NONCE_CACHE_TTL
                            ? Number.parseInt(process.env.AUTH_SCHEMA_CABINET_AUTHORIZATION_NONCE_CACHE_TTL, 10)
                            : 180000,
                        tokenParamsCacheTtl: process.env.AUTH_SCHEMA_CABINET_AUTHORIZATION_TOKEN_PARAMS_CACHE_TTL
                            ? Number.parseInt(process.env.AUTH_SCHEMA_CABINET_AUTHORIZATION_TOKEN_PARAMS_CACHE_TTL, 10)
                            : 60000,
                    },
                },
            },
            diiaSignature: {
                acquirerToken: await envService.getSecret('AUTH_METHOD_DIIA_ID_AUTHORIZATION_ACQUIRER_TOKEN'),
                branchId: await envService.getSecret('AUTH_METHOD_DIIA_ID_AUTHORIZATION_BRANCH_ID'),
                offerId: await envService.getSecret('AUTH_METHOD_DIIA_ID_AUTHORIZATION_OFFER_ID'),
            },
        },

        bankId: {
            clientId: await envService.getSecret('BANK_ID_ACCESS_CLIENT_ID'),
            clientSecret: await envService.getSecret('BANK_ID_ACCESS_CLIENT_SECRET'),
            host: envService.getVar('BANK_ID_API_HOST'),
            tokenPath: envService.getVar('BANK_ID_API_URL_TOKEN_PATH'),
            userPath: envService.getVar('BANK_ID_API_URL_USER_PATH'),
            authPath: envService.getVar('BANK_ID_API_URL_AUTH_PATH'),
            isEnabled: envService.getVar('BANK_ID_IS_ENABLED', 'boolean'),
            rejectUnauthorized: process.env.BANK_ID_VERIFY_HTTPS ? envService.getVar('BANK_ID_VERIFY_HTTPS', 'boolean') : true,
            verifyMemberId: process.env.BANK_ID_VERIFY_MEMBER_ID ? envService.getVar('BANK_ID_VERIFY_MEMBER_ID', 'boolean') : true,
            bankIdVersion: <BankIdVersion>envService.getVar('BANK_ID_VERSION', 'string') ?? BankIdVersion.V1,
            datasetInUse: <BankIdDataset>envService.getVar('BANK_ID_DATASET', 'string') ?? BankIdDataset.DATASET_61,
        } satisfies BankIdConfig,
        photoId: {
            authRequestExpirationMs: process.env.PHOTO_ID_AUTH_REQUEST_EXPIRATION_TIME_MS
                ? Number.parseInt(process.env.PHOTO_ID_AUTH_REQUEST_EXPIRATION_TIME_MS, 10)
                : 600000,
            authUrlHost: envService.getVar('PHOTO_ID_AUTH_URL_HOST'),
        },

        fld: {
            certFilePath: 'secrets/fld-config.key',
        },

        nfc: {
            authUrlHost: envService.getVar('NFC_AUTH_URL_HOST'),
            phoneticEqualityThreshold: process.env.NFC_PHONETIC_EQUALITY_TRASHOLD
                ? envService.getVar('NFC_PHONETIC_EQUALITY_TRASHOLD', 'number')
                : 0.75,
        },

        joinUserToPetitions: {
            isEnabled: process.env.JOIN_USER_TO_PETITIONS_IS_ENABLED === 'true',
        },

        applicationStoreReview: {
            testItn: await envService.getSecret('APPLICATION_STORE_REVIEW_TEST_ITN'),
        },

        enemyTrack: {
            telegramBot: {
                host: envService.getVar('ENEMY_TRACK_TELEGRAM_BOT_HOST'),
                authId: await envService.getSecret('ENEMY_TRACK_TELEGRAM_BOT_AUTH_ID'),
            },
        },

        eResident: {
            registryIsEnabled: process.env.ERESIDENT_REGISTRY_IS_ENABLED === 'true',
            otpTtlInSeconds: process.env.ERESIDENT_APPLICANT_EMAIL_OTP_TTL_IN_SEC
                ? Number.parseInt(process.env.ERESIDENT_APPLICANT_EMAIL_OTP_TTL_IN_SEC)
                : 3600,
            otpLength: process.env.ERESIDENT_APPLICANT_OTP_LENGTH ? Number.parseInt(process.env.ERESIDENT_APPLICANT_OTP_LENGTH) : 6,
            testOtp: await envService.getSecret('ERESIDENT_APPLICANT_TEST_OTP'),
            testEmailRegExp: process.env.ERESIDENT_APPLICANT_TEST_EMAIL_REGEXP
                ? new RegExp(process.env.ERESIDENT_APPLICANT_TEST_EMAIL_REGEXP)
                : // eslint-disable-next-line unicorn/better-regex
                  /test-eresident-applicant-\{\\d+\}@email.c/,
        },

        openid: {
            enableDocumentsCheck: envService.getVar('OPENID_ENABLE_DOCUMENTS_CHECK', 'boolean', true),
        },
    }) satisfies BaseConfig & Record<string, unknown>
