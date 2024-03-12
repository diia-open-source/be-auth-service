// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { AnyBulkWriteOperation, BulkWriteResult, Db, Filter, FindCursor, UpdateFilter, WithId } from 'mongodb'

import { Env } from '@diia-inhouse/env'

import { RefreshToken } from '@interfaces/models/refreshToken'

const collectionName = 'refreshtokens'

const envs: Env[] = [Env.Stage, Env.Prod]
const currentEnv: Env = <Env>process.env.NODE_ENV
const isEnvAvailable: boolean = envs.includes(currentEnv)

const increaseValuePerEnv: Map<Env, number> = new Map([
    [Env.Stage, 1200000], // 20 minutes in ms
    [Env.Prod, 2592000000], // 30 days in ms
])

export async function up(db: Db): Promise<void> {
    if (!isEnvAvailable) {
        return
    }

    const cursor: FindCursor<WithId<RefreshToken>> = await db.collection<RefreshToken>(collectionName).find({})

    const operations: AnyBulkWriteOperation<RefreshToken>[] = []

    let refreshToken: WithId<RefreshToken>
    // eslint-disable-next-line no-cond-assign
    while ((refreshToken = await cursor.next())) {
        const { _id: id, expirationTime } = refreshToken
        const filter: Filter<RefreshToken> = { _id: id }
        const modifier: UpdateFilter<RefreshToken> = { $set: { expirationTime: expirationTime + increaseValuePerEnv.get(currentEnv) } }

        operations.push({
            updateOne: {
                filter,
                update: modifier,
            },
        })
    }

    if (operations.length) {
        const { modifiedCount }: BulkWriteResult = await db.collection<RefreshToken>(collectionName).bulkWrite(operations)

        // eslint-disable-next-line no-console
        console.log('Modified refresh tokens', { modifiedCount })
    }
}
