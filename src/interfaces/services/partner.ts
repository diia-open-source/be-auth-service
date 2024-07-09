import { mongo } from '@diia-inhouse/db'

export interface GetPartnerResult {
    _id: mongo.ObjectId
    scopes: Record<string, string[]>
}
