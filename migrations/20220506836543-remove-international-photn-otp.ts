// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { Db } from 'mongodb'

export async function up(db: Db): Promise<void> {
    const toDrop = ['phonenumberotps']

    const collections = (await db.listCollections().toArray()).map((collection) => collection.name)

    try {
        for (const collection of toDrop) {
            if (collections.includes(collection)) {
                await db.dropCollection(collection)
            }
        }
    } catch (err) {
        return
    }
}
