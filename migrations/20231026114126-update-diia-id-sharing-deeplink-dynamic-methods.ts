import 'module-alias/register'
import { config } from 'dotenv-flow'
import { Db } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

config({ silent: true })

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    await db
        .collection<AuthSchema>(collectionName)
        .updateOne({ code: AuthSchemaCode.DiiaIdSharingDeeplinkDynamic }, { $set: { methods: [AuthMethod.PhotoId] } })
}
