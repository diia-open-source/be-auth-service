// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode, AuthSchemaCondition } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    await Promise.all([
        db
            .collection(collectionName)
            .updateOne(
                { code: AuthSchemaCode.Authorization },
                { $set: { title: 'Щоб авторизуватися у застосунку, будь ласка, підтвердьте особу користувача.' } },
            ),
        db
            .collection(collectionName)
            .updateOne(
                { code: AuthSchemaCode.DiiaIdCreation },
                { $set: { title: 'Будь ласка, підтвердьте особу користувача через інтернет-банкінг.' } },
            ),
        db
            .collection(collectionName)
            .updateOne(
                { code: AuthSchemaCode.DiiaIdSigning },
                { $set: { title: 'Будь ласка, підтвердьте особу користувача через перевірку за фото' } },
            ),
    ])

    const query: Filter<AuthSchema> = { code: AuthSchemaCode.Authorization }
    const { faceLivenessDetectionConfig }: AuthSchema = await db.collection<AuthSchema>(collectionName).findOne(query)

    const authSchema: AuthSchema = {
        code: AuthSchemaCode.Prolong,
        title: 'Підтвердіть свою особу',
        description: 'Ми збережемо додані документи та подовжимо вашу сесію',
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
        faceLivenessDetectionConfig,
    }

    await db.collection(collectionName).insertOne(authSchema)
}
