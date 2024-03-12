import 'module-alias/register'
import { Db } from 'mongodb'

const collectionName = 'authschemas'

export async function up(db: Db): Promise<void> {
    await db.collection(collectionName).updateOne(
        {
            code: 'diia-id-creation',
        },
        {
            $set: {
                admitAfter: [
                    { code: 'diia-id-signing', admitAfterStatus: 'success' },
                    { code: 'diia-id-sharing-deeplink-dynamic', admitAfterStatus: 'success' },
                    { code: 'diia-id-sharing-deeplink-static', admitAfterStatus: 'success' },
                ],
            },
        },
    )
}

export async function down(db: Db): Promise<void> {
    await db.collection(collectionName).updateOne(
        {
            code: 'diia-id-creation',
        },
        {
            $unset: {
                admitAfter: -1,
            },
        },
    )
}
