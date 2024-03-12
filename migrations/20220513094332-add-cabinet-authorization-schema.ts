// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db } from 'mongodb'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const authSchema: unknown = {
        code: AuthSchemaCode.CabinetAuthorization,
        methods: [AuthMethod.Qes],
        [AuthMethod.Qes]: {
            maxAttempts: 3,
            ttl: 180000,
        },
    }

    await db.collection(collectionName).insertOne(authSchema)
}
