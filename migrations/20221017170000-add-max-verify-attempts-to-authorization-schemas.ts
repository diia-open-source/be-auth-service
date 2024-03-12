import 'module-alias/register'
import { Db, Filter, UpdateFilter } from 'mongodb'

import { AuthMethod, AuthSchema, AuthSchemaMethod } from '@interfaces/models/authSchema'

const collectionName = 'authschemas'

function getModifier(parent: AuthSchema | AuthSchemaMethod, prefix = ''): Partial<Record<string, number>> {
    const { methods } = parent
    const result: Partial<Record<string, number>> = {}

    methods?.forEach((method: AuthMethod) => {
        result[`${prefix}${method}.maxVerifyAttempts`] = method === AuthMethod.EmailOtp ? 3 : 1

        const authSchemaMethod = parent[method]

        if (authSchemaMethod && authSchemaMethod?.methods) {
            Object.assign(result, getModifier(authSchemaMethod, `${prefix}${method}.`))
        }
    })

    return result
}

async function updateAuthSchema(db: Db, authSchema: AuthSchema): Promise<void> {
    const { code } = authSchema
    const query: Filter<AuthSchema> = { code }
    const modifier: UpdateFilter<AuthSchema> = {
        $set: getModifier(authSchema),
    }

    await db.collection<AuthSchema>(collectionName).updateOne(query, modifier)
}

export async function up(db: Db): Promise<void> {
    const query: Filter<AuthSchema> = {}
    const authSchemas = await db.collection<AuthSchema>(collectionName).find(query).toArray()
    const tasks = authSchemas.map((authSchema) => updateAuthSchema(db, authSchema))

    await Promise.all(tasks)
}
