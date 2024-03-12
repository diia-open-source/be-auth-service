// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { PlatformType } from '@diia-inhouse/types'

import { AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const config: unknown = {
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
    }

    const query: Filter<AuthSchema> = { code: AuthSchemaCode.Authorization }
    const modifier: UpdateFilter<unknown> = {
        $set: {
            faceLivenessDetectionConfig: {
                [PlatformType.Android]: config,
                [PlatformType.Huawei]: config,
                [PlatformType.iOS]: null,
            },
        },
    }

    await db.collection<AuthSchema>(collectionName).updateOne(query, modifier)
}
