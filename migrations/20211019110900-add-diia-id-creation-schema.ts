// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = { code: AuthSchemaCode.Authorization }
    const { faceLivenessDetectionConfig }: AuthSchema = await db.collection<AuthSchema>(collectionName).findOne(query)

    const authSchema: unknown = {
        code: AuthSchemaCode.DiiaIdCreation,
        checks: [ProcessCode.UserIsUnder14YearsOld, ProcessCode.NoRequiredDocumentForDiiaId, ProcessCode.DiiaIdExistsOnAnotherDevice],
        methods: [AuthMethod.BankId, AuthMethod.Monobank, AuthMethod.PrivatBank],
        [AuthMethod.BankId]: {
            maxAttempts: 3,
            ttl: 180000,
            methods: [AuthMethod.Nfc],
            [AuthMethod.Nfc]: {
                maxAttempts: 3,
                ttl: 180000,
            },
        },
        [AuthMethod.Monobank]: {
            maxAttempts: 3,
            ttl: 180000,
            methods: [AuthMethod.Nfc],
            [AuthMethod.Nfc]: {
                maxAttempts: 3,
                ttl: 180000,
            },
        },
        [AuthMethod.PrivatBank]: {
            maxAttempts: 3,
            ttl: 180000,
            methods: [AuthMethod.Nfc],
            [AuthMethod.Nfc]: {
                maxAttempts: 3,
                ttl: 180000,
            },
        },
        faceLivenessDetectionConfig,
    }

    await db.collection(collectionName).insertOne(authSchema)
}
