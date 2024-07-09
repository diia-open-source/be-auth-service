import { DocumentType } from '@interfaces/services/documents'

export interface FeaturePoints {
    documentType: string
    documentIdentifier: string
    points: number[]
}

export interface GetFeaturePointsResult {
    points: FeaturePoints[]
}

export interface GenerateItnResult {
    itn: string
}

export enum OwnerType {
    Owner = 'owner',
    ProperUser = 'properUser',
}

export interface UserDocument {
    documentType: DocumentType
    documentIdentifier: string
    ownerType: OwnerType
    registrationDate?: Date
    docId?: string
}

export interface GetUserDocumentsResult {
    documents: UserDocument[]
}

export enum HistoryAction {
    Sharing = 'sharing',
    Signing = 'signing',
}

export interface CountHistoryByActionResult {
    count: number
}

export interface ServiceUser {
    login: string
    hashedPassword?: string
    twoFactorSecret?: string
}

export interface CreateDocumentFeaturePointsResponse {
    points: number[]
}
