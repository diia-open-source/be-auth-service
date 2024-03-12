// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter } from 'mongodb'

import { AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const filterQuery: Filter<AuthSchema> = {
        code: {
            $in: [
                <AuthSchemaCode>'international-sharing-deeplink-static',
                <AuthSchemaCode>'international-sharing-deeplink-dynamic',
                <AuthSchemaCode>'international-authorization',
            ],
        },
    }

    await db.collection<AuthSchema>(collectionName).deleteMany(filterQuery)
}
