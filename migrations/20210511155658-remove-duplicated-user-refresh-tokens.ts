/* eslint-disable no-console */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { ObjectId } from 'bson'
import { Db } from 'mongodb'

import { RefreshTokenModel } from '@interfaces/models/refreshToken'

const collectionName = 'refreshtokens'

interface AggregationResultItem {
    docs: RefreshTokenModel[]
}

export async function up(db: Db): Promise<void> {
    const pipeline: Record<string, unknown>[] = [
        { $match: { sessionType: 'User', mobileUid: { $exists: true } } },
        { $group: { _id: { userIdentifier: '$userIdentifier', mobileUid: '$mobileUid' }, docs: { $push: '$$ROOT' } } },
        { $match: { 'docs.1': { $exists: true } } },
    ]

    console.log('Start aggregation refresh tokens')
    const idsToRemove: ObjectId[] = []
    const items: AggregationResultItem[] = await db
        .collection<RefreshTokenModel>(collectionName)
        .aggregate<AggregationResultItem>(pipeline, { allowDiskUse: true })
        .toArray()

    items.forEach(({ docs }) => {
        const [, ...rest]: RefreshTokenModel[] = docs.sort(
            (a: RefreshTokenModel, b: RefreshTokenModel) => b.createdAt.getTime() - a.createdAt.getTime(),
        )
        const ids: ObjectId[] = rest.map(({ _id }: RefreshTokenModel) => _id)

        idsToRemove.push(...ids)
    })

    console.log(`Start deleting refresh tokens: ${idsToRemove.length}`)
    await db.collection(collectionName).deleteMany({ _id: { $in: idsToRemove } })
}
