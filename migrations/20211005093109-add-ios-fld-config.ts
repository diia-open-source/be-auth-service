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
        minEyesToNoseCheck: 1.0,
        maxEyesToNoseCheck: 4.0,
        minLipsToNoseCheck: 1.0,
        maxLipsToNoseCheck: 4.0,
        minBrownToEyesCheck: 0.3,
        maxBrownToEyesCheck: 4.0,
        minBrightness: -1.5,
        maxBrightness: 7.0,
        yawThreshold: 0.1,
        minRollThreshold: 1.5,
        maxRollThreshold: 1.6,
    }

    const query: Filter<AuthSchema> = { code: AuthSchemaCode.Authorization }
    const modifier: UpdateFilter<AuthSchema> = { $set: { [`faceLivenessDetectionConfig.${PlatformType.iOS}`]: config } }

    await db.collection<AuthSchema>(collectionName).updateOne(query, modifier)
}
