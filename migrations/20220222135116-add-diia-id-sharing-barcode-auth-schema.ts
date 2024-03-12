// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter } from 'mongodb'

import { AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = { code: AuthSchemaCode.Authorization }
    const { faceLivenessDetectionConfig }: AuthSchema = await db.collection<AuthSchema>(collectionName).findOne(query)

    const authSchema: AuthSchema = {
        code: AuthSchemaCode.DiiaIdSharingBarcode,
        title: 'Підтвердіть свою особу',
        methods: [],
        faceLivenessDetectionConfig,
    }

    await db.collection(collectionName).insertOne(authSchema)
}
