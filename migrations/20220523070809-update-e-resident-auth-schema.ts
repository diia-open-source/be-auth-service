// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = { code: AuthSchemaCode.EResidentAuth }
    const modifier: UpdateFilter<AuthSchema> = {
        $push: {
            methods: AuthMethod.EResidentNfc,
        },
        $set: {
            [AuthMethod.EResidentNfc]: {
                maxAttempts: 3,
                ttl: 180000,
            },
            title: 'To log in to the application, please verify the identity of the user.',
        },
    }

    await db.collection<AuthSchema>(collectionName).updateMany(query, modifier)
}
