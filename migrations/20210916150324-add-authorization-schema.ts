// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db } from 'mongodb'

import { AuthMethod, AuthSchemaCode, AuthSchemaCondition } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const authSchema: unknown = {
        code: AuthSchemaCode.Authorization,
        methods: [AuthMethod.BankId, AuthMethod.Monobank, AuthMethod.PrivatBank, AuthMethod.Nfc],
        [AuthMethod.BankId]: {
            maxAttempts: 3,
            ttl: 180000,
            methods: [AuthMethod.PhotoId],
            [AuthMethod.PhotoId]: {
                maxAttempts: 3,
                ttl: 180000,
                condition: AuthSchemaCondition.HasDocumentPhoto,
            },
        },
        [AuthMethod.Monobank]: {
            maxAttempts: 3,
            ttl: 180000,
            methods: [AuthMethod.PhotoId],
            [AuthMethod.PhotoId]: {
                maxAttempts: 3,
                ttl: 180000,
                condition: AuthSchemaCondition.HasDocumentPhoto,
            },
        },
        [AuthMethod.PrivatBank]: {
            maxAttempts: 3,
            ttl: 180000,
            methods: [AuthMethod.PhotoId],
            [AuthMethod.PhotoId]: {
                maxAttempts: 3,
                ttl: 180000,
                condition: AuthSchemaCondition.HasDocumentPhoto,
            },
        },
        [AuthMethod.Nfc]: {
            maxAttempts: 3,
            ttl: 180000,
        },
    }

    await db.collection(collectionName).insertOne(authSchema)
}
