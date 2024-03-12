// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { PlatformType } from '@diia-inhouse/types'

import { AuthSchema, FldAndroidConfig, FldAndroidConfigV1, FldConfig, FldConfigVersion } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const androidConfigV1: FldAndroidConfigV1 = {
        solutionsSize: 5,
        deviationThreshold: 0.05,
        confidenceThreshold: 0.85,
        failureCooldown: 500,
        sensorRotationYLow: 70,
        sensorRotationYUp: 110,
        sensorAccelerometerYLow: 8,
        sensorAccelerometerYUp: 11,
        sensorAccelerometerXLow: 0,
        sensorAccelerometerXUp: 2,
        headEulerAngleXLow: -15,
        headEulerAngleXUp: 15,
        headEulerAngleYLow: -10,
        headEulerAngleYUp: 10,
        headEulerAngleZLow: -12,
        headEulerAngleZUp: 12,
        faceBoundingEdgeMin: 12,
        faceBoundingEdgeMax: 88,
        faceMinSize: 70,
        faceBoundingBoxThreshold: 57,
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

    const config: FldConfig[] = [
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

    const query: Filter<AuthSchema> = { faceLivenessDetectionConfig: { $exists: true } }
    const modifier: UpdateFilter<AuthSchema> = {
        $set: {
            [`faceLivenessDetectionConfig.${PlatformType.Huawei}`]: config,
            [`faceLivenessDetectionConfig.${PlatformType.Android}`]: config,
        },
    }

    await db.collection<AuthSchema>(collectionName).updateMany(query, modifier)
}
