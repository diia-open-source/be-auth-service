/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import 'module-alias/register'
import { config } from 'dotenv-flow'
import { Db } from 'mongodb'

config({ silent: true })

const collectionName = ''

export async function up(db: Db): Promise<void> {
    // await db.createCollection(collectionName)
}

export async function down(db: Db): Promise<void> {
    // await db.dropCollection(collectionName)
}
