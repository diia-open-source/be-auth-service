import 'module-alias/register'
import { Db } from 'mongodb'

const collectionsToDrop = ['loginattempts', 'reloginattempts', 'test', 'refreshtokenarchives']

export async function dropCollectionIfExists(db: Db, collectionName: string): Promise<void> {
    const collectionExists = await db.listCollections({ name: collectionName }).hasNext()
    if (collectionExists) {
        await db.collection(collectionName).drop()
    }
}

export async function up(db: Db): Promise<void> {
    await Promise.all(collectionsToDrop.map((collection) => dropCollectionIfExists(db, collection)))
}
