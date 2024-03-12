import { ObjectId } from 'bson'

import { PartnerScopes } from '@diia-inhouse/types'

export interface GetPartnerResult {
    _id: ObjectId
    scopes: PartnerScopes
}
