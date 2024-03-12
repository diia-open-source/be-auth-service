import { SetRequired } from 'type-fest'

import { ActHeaders } from '@diia-inhouse/types'

export enum BankIdVersion {
    V1 = 'v1',
    V2 = 'v2',
}

export enum BankIdDataset {
    DATASET_11 = '11',
    DATASET_21 = '21',
    DATASET_31 = '31',
    DATASET_41 = '41',
    DATASET_51 = '51',
    DATASET_61 = '61',
    DATASET_71 = '71',
}

export interface BankIdConfig {
    clientId: string
    clientSecret: string
    host: string
    tokenPath: string
    userPath: string
    authPath: string
    isEnabled: boolean
    rejectUnauthorized: boolean
    verifyMemberId: boolean
    bankIdVersion: BankIdVersion
    datasetInUse: BankIdDataset
}

export interface BankIdResponse {
    id: string
    name: string
    workable: boolean
    memberId: string
    logoUrl: string
    loginUrl: string
    order: number
}

interface BaseBank {
    name: string
    logoUrl: string
    workable: boolean
}

export interface Bank extends BaseBank {
    bankId: string
    memberId: string
    sortOrder: number
}

export interface BankResponse extends BaseBank {
    id: string
}

export type GetBanksParams = SetRequired<ActHeaders, 'platformType'>
