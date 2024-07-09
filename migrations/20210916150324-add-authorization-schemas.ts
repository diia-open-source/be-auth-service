import 'module-alias/register'
import { mongo } from '@diia-inhouse/db'
import { PlatformType } from '@diia-inhouse/types'

import {
    AuthMethod,
    AuthSchemaCode,
    AuthSchemaCondition,
    FldAndroidConfig,
    FldAndroidConfigV1,
    FldConfig,
    FldConfigVersion,
    FldIosConfig,
} from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'

const collectionName = 'authschemas'

export async function up(db: mongo.Db): Promise<void> {
    const androidConfigV1: FldAndroidConfigV1 = {
        solutionsSize: 1,
        deviationThreshold: 1.11,
        confidenceThreshold: 1.1,
        failureCooldown: 111,
        sensorRotationYLow: 1.1,
        sensorRotationYUp: 1.1,
        sensorAccelerometerYLow: 1.1,
        sensorAccelerometerYUp: 1.1,
        sensorAccelerometerXLow: 1.1,
        sensorAccelerometerXUp: 1.1,
        headEulerAngleXLow: -1.1,
        headEulerAngleXUp: 1.1,
        headEulerAngleYLow: -1.1,
        headEulerAngleYUp: 1.1,
        headEulerAngleZLow: -1.1,
        headEulerAngleZUp: 1.1,
        faceBoundingEdgeMin: 1,
        faceBoundingEdgeMax: 11,
        faceMinSize: 11,
        faceBoundingBoxThreshold: 11,
        faceDarkPixelUp: 11,
        faceLightPixelLow: 111,
        brightThreshold: 1.1,
        darkThreshold: 1.1,
        eyeClosedUpperProbability: 1.1,
        smileLowerProbability: 1.1,
        solutionTtl: 11111,
        allowedCameraResolutions: '480x640;600x800;624x832;720x960',
        frameProcessingExecutors: 1,
        frameProcessingPoolSize: 1,
    }
    const androidConfig: FldAndroidConfig = {
        ...androidConfigV1,
        messages: {
            face_recognition_message_blink: '<b>Кліпніть</b> декілька разів',
            face_recognition_message_smile: 'Посміхніться',
            face_recognition_message_look_forward: 'Подивіться в камеру',
            face_recognition_message_face_forward: 'Тримайте обличчя рівно',
            face_recognition_message_loading: 'Завантаження…',
            face_recognition_message_not_enough_light: 'Недостатньо світла',
            face_recognition_message_too_much_light: 'Обличчя засвічене',
            face_recognition_message_take_phone_aligned_to_head: 'Тримайте телефон вертикально на рівні очей',
            face_recognition_message_looks_like_cheater: 'Не вдалося вас розпізнати',
            face_recognition_message_more_than_one_face_in_frame: 'Більше однієї людини в кадрі',
            face_recognition_message_look_strait_to_camera: 'Дивіться прямо в камеру',
            face_recognition_message_checking_you_are_real_person: 'Перевірка…',
            face_recognition_message_complete: 'Ви впорались!',
            face_recognition_need_face_closer: 'Наблизьте камеру до обличчя',
            face_recognition_face_too_close: 'Занадто близько',
            face_recognition_adjust_face: 'Наведіть рамку на обличчя',
        },
    }
    const iosConfig: FldIosConfig = {
        minEyesToNoseCheck: 1.1,
        maxEyesToNoseCheck: 1.1,
        minLipsToNoseCheck: 1.1,
        maxLipsToNoseCheck: 1.1,
        minBrownToEyesCheck: 1.1,
        maxBrownToEyesCheck: 1.1,
        minBrightness: -1.1,
        maxBrightness: 1.1,
        yawThreshold: 1.1,
        minRollThreshold: 1.1,
        maxRollThreshold: 1.1,
        faceBoundsMinX: 1.1,
        faceBoundsMaxX: 1.1,
        faceBoundsMinMaxY: 1.11,
        faceBoundsMaxMaxY: 1.1,
        faceBoundsMinMinY: 1.1,
        faceBoundsMaxMinY: 1.11,
        faceBoundsHeight: 1.1,
        blurVarienceThreshold: 1,
        messages: {
            face_recognition_no_face_in_frame: 'Не знайдено обличчя у кадрі',
            face_recognition_multiple_persons: 'Знайдено більше одного обличчя у кадрі',
            face_recognition_small_face: 'Піднесіть телефон ближче до обличчя',
            face_recognition_not_centered: 'Наведіть рамку на обличчя',
            face_recognition_incorrect_angle: 'Подивіться прямо у камеру',
            face_recognition_check_brightness: 'Перевірте освітлення',
            face_recognition_incorrect_depth: 'Залишайтесь у рамці. Ми перевіряємо, що це ви',
            face_recognition_blink_action: 'Кліпніть',
        },
    }
    const androidConfigs: FldConfig[] = [
        {
            version: FldConfigVersion['v1.0'],
            maxAppVersion: '3.0.16',
            values: androidConfigV1,
        },
        {
            version: FldConfigVersion['v1.1'],
            values: androidConfig,
        },
    ]

    const faceLivenessDetectionConfig = {
        [PlatformType.Android]: androidConfigs,
        [PlatformType.Huawei]: androidConfigs,
        [PlatformType.iOS]: [{ version: FldConfigVersion['v1.0'], values: iosConfig }],
        [PlatformType.Browser]: null,
    }

    const authSchemas = [
        {
            code: AuthSchemaCode.Authorization,
            title: 'Щоб авторизуватися у застосунку, будь ласка, підтвердьте особу користувача.',
            methods: [AuthMethod.BankId, AuthMethod.Monobank, AuthMethod.PrivatBank, AuthMethod.Nfc],
            [AuthMethod.BankId]: {
                maxAttempts: 3,
                ttl: 180000,
                methods: [AuthMethod.PhotoId],
                [AuthMethod.PhotoId]: {
                    maxAttempts: 3,
                    ttl: 180000,
                    condition: AuthSchemaCondition.HasDocumentPhoto,
                },
            },
            [AuthMethod.Monobank]: {
                maxAttempts: 3,
                ttl: 180000,
                methods: [AuthMethod.PhotoId],
                [AuthMethod.PhotoId]: {
                    maxAttempts: 3,
                    ttl: 180000,
                    condition: AuthSchemaCondition.HasDocumentPhoto,
                },
            },
            [AuthMethod.PrivatBank]: {
                maxAttempts: 3,
                ttl: 180000,
                methods: [AuthMethod.PhotoId],
                [AuthMethod.PhotoId]: {
                    maxAttempts: 3,
                    ttl: 180000,
                    condition: AuthSchemaCondition.HasDocumentPhoto,
                },
            },
            [AuthMethod.Nfc]: {
                maxAttempts: 3,
                ttl: 180000,
            },
            faceLivenessDetectionConfig,
        },
        {
            code: AuthSchemaCode.DiiaIdCreation,
            title: 'Будь ласка, підтвердьте особу користувача через інтернет-банкінг.',
            checks: [ProcessCode.UserIsUnder14YearsOld, ProcessCode.NoRequiredDocumentForDiiaId, ProcessCode.DiiaIdExistsOnAnotherDevice],
            methods: [AuthMethod.PhotoId],
            [AuthMethod.PhotoId]: {
                maxAttempts: 3,
                ttl: 180000,
            },
            faceLivenessDetectionConfig,
        },
        {
            code: AuthSchemaCode.DiiaIdSigning,
            title: 'Будь ласка, підтвердьте особу користувача через перевірку за фото',
            admitAfter: [{ code: AuthSchemaCode.DiiaIdCreation }],
            methods: [AuthMethod.PhotoId],
            [AuthMethod.PhotoId]: {
                maxAttempts: 3,
                ttl: 180000,
            },
            faceLivenessDetectionConfig,
        },
        {
            code: AuthSchemaCode.Prolong,
            title: 'Підтвердіть свою особу',
            description: 'Ми збережемо додані документи та подовжимо вашу сесію',
            methods: [AuthMethod.BankId, AuthMethod.Monobank, AuthMethod.PrivatBank, AuthMethod.Nfc],
            [AuthMethod.BankId]: {
                maxAttempts: 3,
                ttl: 180000,
                methods: [AuthMethod.PhotoId],
                [AuthMethod.PhotoId]: {
                    maxAttempts: 3,
                    ttl: 180000,
                    condition: AuthSchemaCondition.HasDocumentPhoto,
                },
            },
            [AuthMethod.Monobank]: {
                maxAttempts: 3,
                ttl: 180000,
                methods: [AuthMethod.PhotoId],
                [AuthMethod.PhotoId]: {
                    maxAttempts: 3,
                    ttl: 180000,
                    condition: AuthSchemaCondition.HasDocumentPhoto,
                },
            },
            [AuthMethod.PrivatBank]: {
                maxAttempts: 3,
                ttl: 180000,
                methods: [AuthMethod.PhotoId],
                [AuthMethod.PhotoId]: {
                    maxAttempts: 3,
                    ttl: 180000,
                    condition: AuthSchemaCondition.HasDocumentPhoto,
                },
            },
            [AuthMethod.Nfc]: {
                maxAttempts: 3,
                ttl: 180000,
            },
            faceLivenessDetectionConfig,
        },
    ]

    await db.collection(collectionName).insertMany(authSchemas)
}
