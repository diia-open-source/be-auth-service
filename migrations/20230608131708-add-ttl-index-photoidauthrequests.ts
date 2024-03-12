import 'module-alias/register'
import { Db } from 'mongodb'

const photoidauthrequestsCollectionName = 'photoidauthrequests'

export async function up(db: Db): Promise<void> {
    await db.collection(photoidauthrequestsCollectionName).deleteMany({ expirationDate: { $lt: new Date() } })
    await db.collection(photoidauthrequestsCollectionName).createIndex({ expirationDate: 1 }, { expireAfterSeconds: 0 })
}
