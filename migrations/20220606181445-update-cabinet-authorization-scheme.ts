// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = { code: AuthSchemaCode.CabinetAuthorization }
    const modifier: UpdateFilter<AuthSchema> = {
        $push: {
            methods: AuthMethod.BankId,
        },
        $set: {
            [AuthMethod.BankId]: {
                maxAttempts: 3,
                ttl: 180000,
            },
        },
    }

    await db.collection<AuthSchema>(collectionName).updateMany(query, modifier)
}
