// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = { code: AuthSchemaCode.Authorization }
    const { faceLivenessDetectionConfig }: AuthSchema = await db.collection<AuthSchema>(collectionName).findOne(query)

    const authSchema: AuthSchema = {
        code: AuthSchemaCode.DiiaIdSharingDeeplinkStatic,
        title: 'Підтвердіть свою особу',
        admitAfter: [{ code: AuthSchemaCode.DiiaIdCreation }, { code: AuthSchemaCode.Prolong }],
        methods: [AuthMethod.PhotoId],
        [AuthMethod.PhotoId]: {
            maxAttempts: 3,
            ttl: 180000,
        },
        faceLivenessDetectionConfig,
    }

    await db.collection<AuthSchema>(collectionName).insertOne(authSchema)
}
