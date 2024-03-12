// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, UpdateFilter } from 'mongodb'

import { PlatformType } from '@diia-inhouse/types'

import { AuthSchema } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const androidConfig: unknown = {
        version: '1.0',
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
        messages: {},
    }
    const iosConfig: unknown = {
        version: '1.0',
        minEyesToNoseCheck: 1.5,
        maxEyesToNoseCheck: 5.5,
        minLipsToNoseCheck: 0.5,
        maxLipsToNoseCheck: 4.0,
        minBrownToEyesCheck: 0.3,
        maxBrownToEyesCheck: 4.0,
        minBrightness: -1.5,
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
        messages: {},
    }

    const modifier: UpdateFilter<AuthSchema> = {
        $set: {
            [`faceLivenessDetectionConfig.${PlatformType.Android}`]: androidConfig,
            [`faceLivenessDetectionConfig.${PlatformType.Huawei}`]: androidConfig,
            [`faceLivenessDetectionConfig.${PlatformType.iOS}`]: iosConfig,
        },
    }

    await db.collection<AuthSchema>(collectionName).updateMany({}, modifier)
}
