import { ObjectId } from 'bson'

export interface GetAcquirerIdByHashIdResult {
    acquirerId: ObjectId
}

export interface GetServiceEntranceDataByOtpResult {
    acquirerId: ObjectId
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
