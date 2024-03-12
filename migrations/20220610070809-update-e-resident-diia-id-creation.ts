// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = { code: AuthSchemaCode.EResidentDiiaIdCreation }

    const modifier: UpdateFilter<AuthSchema> = {
        $set: {
            checks: [ProcessCode.DiiaIdExistsOnAnotherDevice],
        },
    }

    await db.collection<AuthSchema>(collectionName).findOneAndUpdate(query, modifier)
}
