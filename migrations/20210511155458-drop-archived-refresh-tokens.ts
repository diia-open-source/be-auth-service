import { Db } from 'mongodb'

const collectionName = 'refreshtokenarchives'

export async function up(db: Db): Promise<void> {
    try {
        await db.dropCollection(collectionName)
    } catch (err) {
        return
    }
}
