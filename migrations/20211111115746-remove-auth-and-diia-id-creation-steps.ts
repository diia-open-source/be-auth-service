// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaCode } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    const authorizationQuery: Filter<AuthSchema> = { code: AuthSchemaCode.Authorization }
    const authorizationSchema: AuthSchema = await db.collection<AuthSchema>(collectionName).findOne(authorizationQuery)
    const { methods: authSchemaMethods } = authorizationSchema
    const authorizationModifier: UpdateFilter<AuthSchema> = {}

    authSchemaMethods.forEach((method: AuthMethod) => {
        authorizationModifier[`${method}.methods`] = undefined
    })
    await db.collection(collectionName).updateOne(authorizationQuery, { $set: authorizationModifier })

    const diiaIdCreationQuery: Filter<AuthSchema> = { code: AuthSchemaCode.DiiaIdCreation }
    const diiaIdCreationModifier: UpdateFilter<AuthSchema> = {
        $set: {
            methods: [AuthMethod.PhotoId],
            [AuthMethod.PhotoId]: {
                maxAttempts: 3,
                ttl: 180000,
            },
        },
    }

    await db.collection(collectionName).updateOne(diiaIdCreationQuery, diiaIdCreationModifier)
}
