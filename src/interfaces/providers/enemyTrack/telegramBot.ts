import { ParsedUrlQueryInput } from 'querystring'

export interface QueryParams extends ParsedUrlQueryInput {
    action: 'getQRcode'
    link: string
}
