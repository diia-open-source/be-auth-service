// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = { code: AuthSchemaCode.EResidentAuth }
    const modifier: UpdateFilter<AuthSchema> = {
        $set: {
            title: 'To log in your account verify your identity',
        },
    }

    await db.collection<AuthSchema>(collectionName).updateMany(query, modifier)
}
