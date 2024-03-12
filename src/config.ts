import { BalancingStrategy, MetricsConfig, TransporterConfig } from '@diia-inhouse/diia-app'

import { IdentifierConfig } from '@diia-inhouse/crypto'
import { AppDbConfig, ReplicaSetNodeConfig } from '@diia-inhouse/db'
import { ListenerOptions, QueueConfig, QueueConnectionConfig, QueueConnectionType } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { RedisConfig } from '@diia-inhouse/redis'

import { AuthSchemaMap } from '@interfaces/config'
import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { BankIdConfig, BankIdDataset, BankIdVersion } from '@interfaces/services/bank'

const signAlgorithm = 'RS256'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async (envService: EnvService, serviceName: string) => ({
    isMoleculerEnabled: true,

    transporter: <TransporterConfig>{
        type: envService.getVar('TRANSPORT_TYPE'),
        options: process.env.TRANSPORT_OPTIONS ? envService.getVar('TRANSPORT_OPTIONS', 'object') : {},
    },

    balancing: <BalancingStrategy>{
        strategy: process.env.BALANCING_STRATEGY_NAME,
        strategyOptions: process.env.BALANCING_STRATEGY_OPTIONS ? JSON.parse(process.env.BALANCING_STRATEGY_OPTIONS) : {},
    },

    db: <AppDbConfig>{
        database: process.env.MONGO_DATABASE,
        replicaSet: process.env.MONGO_REPLICA_SET,
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD,
        authSource: process.env.MONGO_AUTH_SOURCE,
        port: envService.getVar('MONGO_PORT', 'number'),
        replicaSetNodes: envService
            .getVar('MONGO_HOSTS', 'string')
            .split(',')
            .map((replicaHost: string): ReplicaSetNodeConfig => ({ replicaHost })),
        readPreference: process.env.MONGO_READ_PREFERENCE,
        indexes: {
            sync: process.env.MONGO_INDEXES_SYNC === 'true',
            exitAfterSync: process.env.MONGO_INDEXES_EXIT_AFTER_SYNC === 'true',
        },
    },

    redis: <RedisConfig>{
        readWrite: envService.getVar('REDIS_READ_WRITE_OPTIONS', 'object'),

        readOnly: envService.getVar('REDIS_READ_ONLY_OPTIONS', 'object'),
    },

    store: <RedisConfig>{
        readWrite: envService.getVar('STORE_READ_WRITE_OPTIONS', 'object'),

        readOnly: envService.getVar('STORE_READ_ONLY_OPTIONS', 'object'),
    },

    rabbit: <QueueConnectionConfig>{
        [QueueConnectionType.Internal]: <QueueConfig>{
            connection: {
                hostname: process.env.RABBIT_HOST,
                port: process.env.RABBIT_PORT ? envService.getVar('RABBIT_PORT', 'number') : undefined,
                username: process.env.RABBIT_USERNAME,
                password: process.env.RABBIT_PASSWORD,
                heartbeat: process.env.RABBIT_HEARTBEAT ? envService.getVar('RABBIT_HEARTBEAT', 'number') : undefined,
            },
            socketOptions: {
                clientProperties: {
                    applicationName: `${serviceName} Service`,
                },
            },
            reconnectOptions: {
                reconnectEnabled: true,
            },
            listenerOptions: <ListenerOptions>{
                prefetchCount: process.env.RABBIT_QUEUE_PREFETCH_COUNT ? envService.getVar('RABBIT_QUEUE_PREFETCH_COUNT', 'number') : 10,
            },
        },
        [QueueConnectionType.External]: <QueueConfig>{
            connection: {
                hostname: process.env.EXTERNAL_RABBIT_HOST,
                port: process.env.EXTERNAL_RABBIT_PORT ? envService.getVar('EXTERNAL_RABBIT_PORT', 'number') : undefined,
                username: process.env.EXTERNAL_RABBIT_USERNAME,
                password: process.env.EXTERNAL_RABBIT_PASSWORD,
                heartbeat: process.env.EXTERNAL_RABBIT_HEARTBEAT ? parseInt(process.env.EXTERNAL_RABBIT_HEARTBEAT, 10) : undefined,
            },
            socketOptions: {
                clientProperties: {
                    applicationName: `${serviceName} Service`,
                },
            },
            reconnectOptions: {
                reconnectEnabled: true,
            },
            listenerOptions: <ListenerOptions>{
                prefetchCount: process.env.EXTERNAL_RABBIT_QUEUE_PREFETCH_COUNT
                    ? parseInt(process.env.EXTERNAL_RABBIT_QUEUE_PREFETCH_COUNT, 10)
                    : 1,
            },
            assertExchanges: process.env.EXTERNAL_RABBIT_ASSERT_EXCHANGES === 'true',
        },
    },

    app: {
        integrationPointsTimeout: process.env.INTEGRATION_TIMEOUT_IN_MSEC
            ? parseInt(process.env.INTEGRATION_TIMEOUT_IN_MSEC, 10)
            : 10 * 1000,
        externalBusTimeout: process.env.EXTERNAL_BUS_TIMEOUT ? parseInt(process.env.EXTERNAL_BUS_TIMEOUT, 10) : 5 * 1000,
    },

    identifier: <IdentifierConfig>{
        salt: process.env.SALT,
    },

    healthCheck: {
        isEnabled: process.env.HEALTH_CHECK_IS_ENABLED === 'true',
        port: process.env.HEALTH_CHECK_IS_PORT ? parseInt(process.env.HEALTH_CHECK_IS_PORT, 10) : 3000,
    },

    metrics: <MetricsConfig>{
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

    cacheDb: <AppDbConfig>{
        isEnabled: process.env.MONGO_CACHE_IS_ENABLED === 'true',
        database: process.env.MONGO_CACHE_DATABASE,
        replicaSet: process.env.MONGO_CACHE_REPLICA_SET,
        user: process.env.MONGO_CACHE_USER,
        password: process.env.MONGO_CACHE_PASSWORD,
        authSource: process.env.MONGO_CACHE_AUTH_SOURCE,
        port: process.env.MONGO_CACHE_PORT ? envService.getVar('MONGO_CACHE_PORT', 'number') : undefined,
        replicaSetNodes: process.env.MONGO_CACHE_HOSTS
            ? envService
                  .getVar('MONGO_CACHE_HOSTS', 'string')
                  .split(',')
                  .map((replicaHost: string): ReplicaSetNodeConfig => ({ replicaHost }))
            : [],
        readPreference: process.env.MONGO_CACHE_READ_PREFERENCE,
    },

    thirdParty: {
        monobank: {
            isEnabled: process.env.AUTH_MONOBANK_IS_ENABLED === 'true',
            baseUrl: process.env.AUTH_MONOBANK_BASE_URL ? process.env.AUTH_MONOBANK_BASE_URL : 'api.monobank.ua',
            APIToken: envService.getVar('AUTH_MONOBANK_API_TOKEN'),
            pathToPrivateKey: envService.getVar('AUTH_MONOBANK_PRIVATE_KEY_PATH'),
        },
        privatbank: {
            baseUrl: envService.getVar('AUTH_PRIVATBANK_BASE_URL'),
            version: '1',
            account: envService.getVar('AUTH_PRIVATBANK_ACCOUNT'),
            secret: envService.getVar('AUTH_PRIVATBANK_ACCOUNT_SECRET'),
        },
    },

    eis: {
        isEnabled: process.env.EIS_IS_ENABLED === 'true',
        host: process.env.EIS_API_HOST,
        port: process.env.EIS_API_PORT,
        username: process.env.EIS_AUTH_USERNAME,
        password: process.env.EIS_AUTH_PASSWORD,
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
            privateKey: process.env.JWE_SECRET_TOKEN_PRIVATE_KEY,
            publicKey: process.env.JWE_SECRET_TOKEN_PUBLIC_KEY,
        },
        temporaryTokenSignOptions: {
            algorithm: signAlgorithm,
            expiresIn: process.env.TEMPORARY_JWT_EXPIRES_IN || '1m',
            audience: process.env.TEMPORARY_JWT_AUDIENCE,
            issuer: process.env.TEMPORARY_JWT_ISSUER,
        },
        jwk: envService.getVar('JWE_SECRET_DATA_JWK'),
        isCustomRefreshTokenExpirationEnabled: envService.getVar('AUTH_SCHEMA_IS_CUSTOM_REFRESH_TOKEN_EXPIRATION_ENABLED', 'boolean'),
        testAuthByItnIsEnabled: process.env.TEST_AUTH_BY_ITN_IS_ENABLED === 'true',
        checkingForValidItnIsEnabled: process.env.CHECKING_FOR_VALID_ITN_IS_ENABLED === 'true',
        refreshTokenLifetime: process.env.JWT_REFRESH_EXPIRES_IN
            ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN, 10)
            : 30 * 24 * 60 * 60 * 1000,
        partnerRefreshTokenLifetime: process.env.JWT_PARTNER_REFRESH_EXPIRES_IN
            ? parseInt(process.env.JWT_PARTNER_REFRESH_EXPIRES_IN, 10)
            : 2 * 60 * 60 * 1000,
        acquirerRefreshTokenLifetime: process.env.JWT_ACQUIRER_REFRESH_EXPIRES_IN
            ? parseInt(process.env.JWT_ACQUIRER_REFRESH_EXPIRES_IN, 10)
            : 2 * 60 * 60 * 1000,
        cabinetTokenExpiresIn: process.env.JWT_CABINET_EXPIRES_IN || '30m',
        cabinetRefreshTokenLifetime: process.env.JWT_CABINET_REFRESH_EXPIRES_IN
            ? parseInt(process.env.JWT_CABINET_REFRESH_EXPIRES_IN, 10)
            : 30 * 60 * 1000,
        tokenCacheDurationInSec: process.env.TOKEN_CACHE_DURATION_IN_SEC
            ? parseInt(process.env.TOKEN_CACHE_DURATION_IN_SEC, 10)
            : 2 * 60 * 60,
        cabinetTokenCacheDurationInSec: process.env.TOKEN_CACHE_DURATION_IN_SEC
            ? parseInt(process.env.TOKEN_CACHE_DURATION_IN_SEC, 10)
            : 30 * 60,
        refreshTokenExpirationsArchiveThresholdMs: process.env.REFRESH_TOKEN_EXPIRATIONS_ARCHIVE_THRESHOLD_MS
            ? parseInt(process.env.REFRESH_TOKEN_EXPIRATIONS_ARCHIVE_THRESHOLD_MS, 10)
            : 7776000000,
        schema: {
            comparingItnIsEnabled: process.env.AUTH_SCHEMA_COMPARING_ITN_IS_ENABLED === 'true',
            admissionStepsTtl: process.env.AUTH_ADMISSION_STEPS_TTL ? parseInt(process.env.AUTH_ADMISSION_STEPS_TTL, 10) : 180000,
            schemaMap: <AuthSchemaMap>{
                [AuthSchemaCode.Authorization]: {
                    tokenParamsCacheTtl: process.env.AUTH_SCHEMA_AUTHORIZATION_TOKEN_PARAMS_CACHE_TTL
                        ? parseInt(process.env.AUTH_SCHEMA_AUTHORIZATION_TOKEN_PARAMS_CACHE_TTL, 10)
                        : 60000,
                },
                [AuthSchemaCode.EResidentFirstAuth]: {
                    tokenParamsCacheTtl: process.env.AUTH_SCHEMA_ERESIDENT_FIRST_AUTH_TOKEN_PARAMS_CACHE_TTL
                        ? parseInt(process.env.AUTH_SCHEMA_ERESIDENT_FIRST_AUTH_TOKEN_PARAMS_CACHE_TTL, 10)
                        : 300000,
                },
                [AuthSchemaCode.EResidentAuth]: {
                    tokenParamsCacheTtl: process.env.AUTH_SCHEMA_ERESIDENT_AUTH_TOKEN_PARAMS_CACHE_TTL
                        ? parseInt(process.env.AUTH_SCHEMA_ERESIDENT_AUTH_TOKEN_PARAMS_CACHE_TTL, 10)
                        : 300000,
                },
                [AuthSchemaCode.CabinetAuthorization]: {
                    nonceCacheTtl: process.env.AUTH_SCHEMA_CABINET_AUTHORIZATION_NONCE_CACHE_TTL
                        ? parseInt(process.env.AUTH_SCHEMA_CABINET_AUTHORIZATION_NONCE_CACHE_TTL, 10)
                        : 180000,
                    tokenParamsCacheTtl: process.env.AUTH_SCHEMA_CABINET_AUTHORIZATION_TOKEN_PARAMS_CACHE_TTL
                        ? parseInt(process.env.AUTH_SCHEMA_CABINET_AUTHORIZATION_TOKEN_PARAMS_CACHE_TTL, 10)
                        : 60000,
                },
            },
        },
        diiaSignature: {
            acquirerToken: process.env.AUTH_METHOD_DIIA_ID_AUTHORIZATION_ACQUIRER_TOKEN
                ? envService.getVar('AUTH_METHOD_DIIA_ID_AUTHORIZATION_ACQUIRER_TOKEN')
                : '',
            branchId: process.env.AUTH_METHOD_DIIA_ID_AUTHORIZATION_BRANCH_ID,
            offerId: process.env.AUTH_METHOD_DIIA_ID_AUTHORIZATION_OFFER_ID,
        },
    },
    bankId: <BankIdConfig>{
        clientId: envService.getVar('BANK_ID_ACCESS_CLIENT_ID'),
        clientSecret: envService.getVar('BANK_ID_ACCESS_CLIENT_SECRET'),
        host: envService.getVar('BANK_ID_API_HOST'),
        tokenPath: envService.getVar('BANK_ID_API_URL_TOKEN_PATH'),
        userPath: envService.getVar('BANK_ID_API_URL_USER_PATH'),
        authPath: envService.getVar('BANK_ID_API_URL_AUTH_PATH'),
        isEnabled: envService.getVar('BANK_ID_IS_ENABLED', 'boolean'),
        rejectUnauthorized: process.env.BANK_ID_VERIFY_HTTPS ? envService.getVar('BANK_ID_VERIFY_HTTPS', 'boolean') : true,
        verifyMemberId: process.env.BANK_ID_VERIFY_MEMBER_ID ? envService.getVar('BANK_ID_VERIFY_MEMBER_ID', 'boolean') : true,
        bankIdVersion: envService.getVar('BANK_ID_VERSION', 'string') ?? BankIdVersion.V1,
        datasetInUse: envService.getVar('BANK_ID_DATASET', 'string') ?? BankIdDataset.DATASET_61,
    },
    photoId: {
        authRequestExpirationMs: process.env.PHOTO_ID_AUTH_REQUEST_EXPIRATION_TIME_MS
            ? parseInt(process.env.PHOTO_ID_AUTH_REQUEST_EXPIRATION_TIME_MS, 10)
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
        testItn: process.env.APPLICATION_STORE_REVIEW_TEST_ITN,
    },

    enemyTrack: {
        telegramBot: {
            host: envService.getVar('ENEMY_TRACK_TELEGRAM_BOT_HOST'),
            authId: envService.getVar('ENEMY_TRACK_TELEGRAM_BOT_AUTH_ID'),
        },
    },

    eResident: {
        registryIsEnabled: process.env.ERESIDENT_REGISTRY_IS_ENABLED === 'true',
        otpTtlInSeconds: process.env.ERESIDENT_APPLICANT_EMAIL_OTP_TTL_IN_SEC
            ? parseInt(process.env.ERESIDENT_APPLICANT_EMAIL_OTP_TTL_IN_SEC)
            : 3600,
        otpLength: process.env.ERESIDENT_APPLICANT_OTP_LENGTH ? parseInt(process.env.ERESIDENT_APPLICANT_OTP_LENGTH) : 6,
        testOtp: process.env.ERESIDENT_APPLICANT_TEST_OTP ? process.env.ERESIDENT_APPLICANT_TEST_OTP : '123456',
        testEmailRegExp: process.env.ERESIDENT_APPLICANT_TEST_EMAIL_REGEXP
            ? new RegExp(process.env.ERESIDENT_APPLICANT_TEST_EMAIL_REGEXP)
            : /test-eresident-applicant-\{\\d+\}@email.c/,
    },

    openid: {
        enableDocumentsCheck: envService.getVar('OPENID_ENABLE_DOCUMENTS_CHECK', 'boolean', true),
    },
})
