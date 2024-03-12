import { GenderAsSex } from '@interfaces/services/authMethods'

export enum BankIdDocumentType {
    Passport = 'passport',
    IdPassport = 'idpassport',
    ForeignPassport = 'zpassport',
    Ident = 'ident',
}

export interface BankIdAddress {
    readonly type: string
    readonly country: string
    readonly state: string
    readonly area: string
    readonly city: string
    readonly street: string
    readonly houseNo: string
    readonly flatNo: string
}

export interface BankIdDocument {
    type: BankIdDocumentType
    typeName: string
    series?: string
    number: string
    issue: string
    dateIssue: string
    dateExpiration: string
    issueCountryIso2: string
}

export interface BankIdUser {
    readonly type: string
    readonly firstName: string
    readonly middleName: string
    readonly lastName: string
    readonly phone: string
    readonly inn: string
    readonly birthDay: string
    readonly sex: GenderAsSex
    readonly email: string
    readonly addresses: BankIdAddress[]
    readonly documents: BankIdDocument[]
}
