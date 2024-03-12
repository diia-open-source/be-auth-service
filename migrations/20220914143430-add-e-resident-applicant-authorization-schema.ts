import 'module-alias/register'
import { Db } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const authSchema: AuthSchema = {
        code: AuthSchemaCode.EResidentApplicantAuth,
        methods: [AuthMethod.EmailOtp],
        [AuthMethod.EmailOtp]: {
            maxAttempts: 3,
            maxVerifyAttempts: 3,
            ttl: 180000,
        },
    }

    await db.collection(collectionName).insertOne(authSchema)
}

export async function down(db: Db): Promise<void> {
    await db.collection(collectionName).deleteOne({
        code: AuthSchemaCode.EResidentApplicantAuth,
    })
}
