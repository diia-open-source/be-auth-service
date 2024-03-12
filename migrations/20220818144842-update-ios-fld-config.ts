// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { PlatformType } from '@diia-inhouse/types'

import { AuthSchema } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = {
        [`faceLivenessDetectionConfig.${PlatformType.iOS}`]: { $elemMatch: { 'values.blurVarienceThreshold': { $ne: null } } },
    }

    const modifier: UpdateFilter<AuthSchema> = {
        $set: { [`faceLivenessDetectionConfig.${PlatformType.iOS}.$[].values.blurVarienceThreshold`]: 12 },
    }

    await db.collection<AuthSchema>(collectionName).updateMany(query, modifier)
}
