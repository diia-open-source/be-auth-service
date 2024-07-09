import 'module-alias/register'
import { mongo } from '@diia-inhouse/db'
import { PlatformType } from '@diia-inhouse/types'

import { AuthMethod, AuthSchemaCode, FldConfig, FldConfigVersion } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: mongo.Db): Promise<void> {
    const androidConfig: FldConfig[] = [
        {
            version: FldConfigVersion['v1.1'],
            values: {
                solutionsSize: 1,
                deviationThreshold: 1.11,
                confidenceThreshold: 1.11,
                failureCooldown: 111,
                sensorRotationYLow: 11,
                sensorRotationYUp: 111,
                sensorAccelerometerYLow: 1,
                sensorAccelerometerYUp: 11,
                sensorAccelerometerXLow: 1,
                sensorAccelerometerXUp: 1,
                headEulerAngleXLow: -11,
                headEulerAngleXUp: 11,
                headEulerAngleYLow: -11,
                headEulerAngleYUp: 11,
                headEulerAngleZLow: -11,
                headEulerAngleZUp: 11,
                faceBoundingEdgeMin: 11,
                faceBoundingEdgeMax: 11,
                faceMinSize: 11,
                faceBoundingBoxThreshold: 11,
                faceDarkPixelUp: 11,
                faceLightPixelLow: 111,
                brightThreshold: 1.1,
                darkThreshold: 1.1,
                eyeClosedUpperProbability: 1.1,
                smileLowerProbability: 1.1,
                solutionTtl: 111111,
                allowedCameraResolutions: '480x640;600x800;624x832;720x960',
                frameProcessingExecutors: 1,
                frameProcessingPoolSize: 1,
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
                minEyesToNoseCheck: 1.1,
                maxEyesToNoseCheck: 1.1,
                minLipsToNoseCheck: 1.1,
                maxLipsToNoseCheck: 1,
                minBrownToEyesCheck: 1.1,
                maxBrownToEyesCheck: 1,
                minBrightness: -1,
                maxBrightness: 1,
                yawThreshold: 1.1,
                minRollThreshold: 1.1,
                maxRollThreshold: 1.1,
                faceBoundsMinX: 1.1,
                faceBoundsMaxX: 1.1,
                faceBoundsMinMaxY: 1.11,
                faceBoundsMaxMaxY: 1.1,
                faceBoundsMinMinY: 1.1,
                faceBoundsMaxMinY: 1.11,
                faceBoundsHeight: 1.11,
                blurVarienceThreshold: 1,
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

    const authSchemas = [
        {
            code: AuthSchemaCode.EResidentAuth,
            title: 'Please scan the MRZ of your passport',
            methods: [AuthMethod.EResidentMrz],
            [AuthMethod.EResidentMrz]: {
                maxAttempts: 3,
                ttl: 180000,
                methods: [AuthMethod.PhotoId],
                [AuthMethod.PhotoId]: {
                    maxAttempts: 3,
                    ttl: 180000,
                },
            },
            faceLivenessDetectionConfig,
        },
        {
            code: AuthSchemaCode.EResidentApplicantAuth,
            methods: [AuthMethod.EmailOtp],
            [AuthMethod.EmailOtp]: {
                maxAttempts: 3,
                maxVerifyAttempts: 3,
                ttl: 180000,
            },
        },
    ]

    await db.collection(collectionName).insertMany(authSchemas)
}
