// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db } from 'mongodb'

import { PlatformType } from '@diia-inhouse/types'

import { AuthMethod, AuthSchema, AuthSchemaCode, FldConfig, FldConfigVersion } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const androidConfig: FldConfig[] = [
        {
            version: FldConfigVersion['v1.1'],
            values: {
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
                messages: {
                    face_recognition_message_blink: 'authUrl.v3.face-recognition.Android.face_recognition_message_blink',
                    face_recognition_message_smile: 'authUrl.v3.face-recognition.Android.face_recognition_message_smile',
                    face_recognition_message_look_forward: 'authUrl.v3.face-recognition.Android.face_recognition_message_look_forward',
                    face_recognition_message_face_forward: 'authUrl.v3.face-recognition.Android.face_recognition_message_face_forward',
                    face_recognition_message_loading: 'authUrl.v3.face-recognition.Android.face_recognition_message_loading',
                    face_recognition_message_not_enough_light:
                        'authUrl.v3.face-recognition.Android.face_recognition_message_not_enough_light',
                    face_recognition_message_too_much_light: 'authUrl.v3.face-recognition.Android.face_recognition_message_too_much_light',
                    face_recognition_message_take_phone_aligned_to_head:
                        'authUrl.v3.face-recognition.Android.face_recognition_message_take_phone_aligned_to_head',
                    face_recognition_message_looks_like_cheater:
                        'authUrl.v3.face-recognition.Android.face_recognition_message_looks_like_cheater',
                    face_recognition_message_more_than_one_face_in_frame:
                        'authUrl.v3.face-recognition.Android.face_recognition_message_more_than_one_face_in_frame',
                    face_recognition_message_look_strait_to_camera:
                        'authUrl.v3.face-recognition.Android.face_recognition_message_look_strait_to_camera',
                    face_recognition_message_checking_you_are_real_person:
                        'authUrl.v3.face-recognition.Android.face_recognition_message_checking_you_are_real_person',
                    face_recognition_message_complete: 'authUrl.v3.face-recognition.Android.face_recognition_message_complete',
                    face_recognition_need_face_closer: 'authUrl.v3.face-recognition.Android.face_recognition_need_face_closer',
                    face_recognition_face_too_close: 'authUrl.v3.face-recognition.Android.face_recognition_face_too_close',
                    face_recognition_adjust_face: 'authUrl.v3.face-recognition.Android.face_recognition_adjust_face',
                },
            },
        },
    ]
    const iosConfig: FldConfig[] = [
        {
            version: FldConfigVersion['v1.0'],
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
    const faceLivenessDetectionConfig = {
        [PlatformType.Huawei]: androidConfig,
        [PlatformType.Android]: androidConfig,
        [PlatformType.iOS]: iosConfig,
        [PlatformType.Browser]: null,
    }

    const authSchema: AuthSchema = {
        code: AuthSchemaCode.ResidencePermitNfcAdding,
        methods: [AuthMethod.Nfc],
        [AuthMethod.Nfc]: {
            maxAttempts: 3,
            ttl: 180000,
        },
        faceLivenessDetectionConfig,
    }

    await db.collection(collectionName).insertOne(authSchema)
}
