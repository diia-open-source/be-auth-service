import 'module-alias/register'
import { Db } from 'mongodb'

const collectionRefreshTokens = 'refreshtokens'

export async function up(db: Db): Promise<void> {
    await db.collection(collectionRefreshTokens).deleteMany({
        sessionType: { $ne: 'User' },
        $or: [{ expirationTime: { $lt: Date.now() } }],
    })
    await db.collection(collectionRefreshTokens).updateMany(
        {
            sessionType: { $ne: 'User' },
        },
        [
            {
                $set: {
                    expirationDate: {
                        $toDate: '$expirationTime',
                    },
                },
            },
        ],
    )
    await db.collection(collectionRefreshTokens).createIndex(
        { expirationDate: 1 },
        {
            expireAfterSeconds: 0,
        },
    )
}
