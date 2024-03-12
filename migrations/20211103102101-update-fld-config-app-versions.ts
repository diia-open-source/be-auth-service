// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'

import { Db, UpdateFilter } from 'mongodb'

import { PlatformType } from '@diia-inhouse/types'

import { AuthSchema, FldAndroidConfig, FldAndroidConfigV1, FldConfig, FldConfigVersion, FldIosConfig } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const androidConfigV1: FldAndroidConfigV1 = {
        solutionsSize: 5,
        deviationThreshold: 0.05,
        confidenceThreshold: 0.85,
        failureCooldown: 500,
        sensorRotationYLow: 70.0,
        sensorRotationYUp: 110.0,
        sensorAccelerometerYLow: 8.0,
        sensorAccelerometerYUp: 11.0,
        sensorAccelerometerXLow: 0.0,
        sensorAccelerometerXUp: 2.0,
        headEulerAngleXLow: -15.0,
        headEulerAngleXUp: 15.0,
        headEulerAngleYLow: -10.0,
        headEulerAngleYUp: 10.0,
        headEulerAngleZLow: -12.0,
        headEulerAngleZUp: 12.0,
        faceBoundingEdgeMin: 5,
        faceBoundingEdgeMax: 95,
        faceMinSize: 70,
        faceBoundingBoxThreshold: 80,
        faceDarkPixelUp: 25,
        faceLightPixelLow: 220,
        brightThreshold: 0.6,
        darkThreshold: 0.6,
        eyeClosedUpperProbability: 0.6,
        smileLowerProbability: 0.1,
        solutionTtl: 10000,
        allowedCameraResolutions: '480x640;600x800;624x832;720x960',
        frameProcessingExecutors: 3,
        frameProcessingPoolSize: 4,
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
        minEyesToNoseCheck: 1.5,
        maxEyesToNoseCheck: 5.5,
        minLipsToNoseCheck: 0.5,
        maxLipsToNoseCheck: 4.0,
        minBrownToEyesCheck: 0.3,
        maxBrownToEyesCheck: 4.0,
        minBrightness: -2.5,
        maxBrightness: 7.0,
        yawThreshold: 0.1,
        minRollThreshold: 1.5,
        maxRollThreshold: 1.6,
        faceBoundsMinX: 0.1,
        faceBoundsMaxX: 0.9,
        faceBoundsMinMaxY: 0.69,
        faceBoundsMaxMaxY: 0.9,
        faceBoundsMinMinY: 0.1,
        faceBoundsMaxMinY: 0.31,
        faceBoundsHeight: 0.4,
        blurVarienceThreshold: 2,
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
    const modifier: UpdateFilter<AuthSchema> = {
        $set: {
            faceLivenessDetectionConfig: {
                [PlatformType.Android]: androidConfigs,
                [PlatformType.Huawei]: androidConfigs,
                [PlatformType.iOS]: [{ version: FldConfigVersion['v1.0'], values: iosConfig }],
                [PlatformType.Browser]: null,
            },
        },
    }

    await db.collection<AuthSchema>(collectionName).updateMany({}, modifier)
}
