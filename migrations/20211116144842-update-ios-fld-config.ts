// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { AuthSchema, FldIosConfig } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = { faceLivenessDetectionConfig: { $exists: true } }
    const config: FldIosConfig = {
        minEyesToNoseCheck: 1.5,
        maxEyesToNoseCheck: 5.5,
        minLipsToNoseCheck: 0.5,
        maxLipsToNoseCheck: 4,
        minBrownToEyesCheck: 0.3,
        maxBrownToEyesCheck: 4,
        minBrightness: -3.0,
        maxBrightness: 7,
        yawThreshold: 0.1,
        minRollThreshold: 1.5,
        maxRollThreshold: 1.6,
        faceBoundsMinX: 0.1,
        faceBoundsMaxX: 0.9,
        faceBoundsMinMaxY: 0.69,
        faceBoundsMaxMaxY: 0.9,
        faceBoundsMinMinY: 0.1,
        faceBoundsMaxMinY: 0.31,
        faceBoundsHeight: 0.47,
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
    const modifier: UpdateFilter<AuthSchema> = {
        $set: {
            'faceLivenessDetectionConfig.iOS': [
                {
                    version: '1.0',
                    values: config,
                },
            ],
        },
    }

    await db.collection<AuthSchema>(collectionName).updateMany(query, modifier)
}
