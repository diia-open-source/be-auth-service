import 'module-alias/register'
import { Db } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    await db.collection<AuthSchema>(collectionName).updateOne(
        {
            code: AuthSchemaCode.EResidentAuth,
        },
        {
            $set: {
                methods: [AuthMethod.EResidentMrz],
            },
            $unset: {
                [AuthMethod.EResidentNfc]: 1,
            },
        },
    )
}
