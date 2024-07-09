import { ParsedUrlQueryInput } from 'node:querystring'

export interface QueryParams extends ParsedUrlQueryInput {
    action: 'getQRcode'
    link: string
}
