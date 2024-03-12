// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { PlatformType } from '@diia-inhouse/types'

import { AuthSchema, FldConfig, FldConfigVersion } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const iosConfigWithLowBlur: FldConfig[] = [
        {
            version: FldConfigVersion['v1.0'],
            maxAppVersion: '3.0.43.895',
            values: {
                minEyesToNoseCheck: 1.5,
                maxEyesToNoseCheck: 5.5,
                minLipsToNoseCheck: 0.5,
                maxLipsToNoseCheck: 4,
                minBrownToEyesCheck: 0.3,
                maxBrownToEyesCheck: 4,
                minBrightness: -3,
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
                    face_recognition_no_face_in_frame: 'authUrl.v3.face-recognition.iOS.face_recognition_no_face_in_frame',
                    face_recognition_multiple_persons: 'authUrl.v3.face-recognition.iOS.face_recognition_multiple_persons',
                    face_recognition_small_face: 'authUrl.v3.face-recognition.iOS.face_recognition_small_face',
                    face_recognition_not_centered: 'authUrl.v3.face-recognition.iOS.face_recognition_not_centered',
                    face_recognition_incorrect_angle: 'authUrl.v3.face-recognition.iOS.face_recognition_incorrect_angle',
                    face_recognition_check_brightness: 'authUrl.v3.face-recognition.iOS.face_recognition_check_brightness',
                    face_recognition_incorrect_depth: 'authUrl.v3.face-recognition.iOS.face_recognition_incorrect_depth',
                    face_recognition_blink_action: 'authUrl.v3.face-recognition.iOS.face_recognition_blink_action',
                },
            },
        },
    ]

    const query: Filter<AuthSchema> = {
        [`faceLivenessDetectionConfig.${PlatformType.iOS}`]: { $elemMatch: { 'values.blurVarienceThreshold': { $ne: null } } },
    }

    const modifier: UpdateFilter<AuthSchema> = {
        $push: { [`faceLivenessDetectionConfig.${PlatformType.iOS}`]: { $each: iosConfigWithLowBlur, $position: 0 } },
    }

    await db.collection<AuthSchema>(collectionName).updateMany(query, modifier)
}
