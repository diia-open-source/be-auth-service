import { mongo } from '@diia-inhouse/db'

export interface GetAcquirerIdByHashIdResult {
    acquirerId: mongo.ObjectId
}

export interface GetServiceEntranceDataByOtpResult {
    acquirerId: mongo.ObjectId
    branchHashId: string
    offerHashId: string
    offerRequestHashId: string
    offerRequestExpiration: number
}

export interface CreateOfferRequestResult {
    deeplink: string
}

export enum OfferRequestType {
    Dynamic = 'dynamic',
    Static = 'static',
}
