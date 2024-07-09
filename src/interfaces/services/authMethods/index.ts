import { EResidentApplicant } from '@diia-inhouse/types'

import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { BankIdUser } from '@interfaces/services/authMethods/bankId'
import { DsUserDTO } from '@interfaces/services/authMethods/ds'
import { MonobankUserDTO } from '@interfaces/services/authMethods/monobank'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { PrivatBankUserDTO } from '@interfaces/services/authMethods/privatBank'
import { QesUserDTO } from '@interfaces/services/authMethods/qes'
import { EResidency } from '@interfaces/services/documents'

export enum GenderAsSex {
    M = 'M',
    F = 'F',
}

export enum GenderAsPerson {
    Man = 'man',
    Woman = 'woman',
}

export type AuthMethodVerifyResult =
    | MonobankUserDTO
    | PrivatBankUserDTO
    | BankIdUser
    | NfcUserDTO
    | EResidency
    | EResidentApplicant
    | QesUserDTO
    | DsUserDTO

export declare class AuthProviderFactory {
    requestAuthorizationUrl(ops: AuthUrlOps, headers: AuthProviderHeaders, schemaCode?: AuthSchemaCode): Promise<string> | never
    verify(requestId: string, ops: AuthMethodVerifyParams): Promise<AuthMethodVerifyResult | void> | never
}
