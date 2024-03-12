import { Document } from 'mongoose'

import { PlatformType } from '@diia-inhouse/types'

import { BankIdUser } from '@interfaces/services/authMethods/bankId'
import { Bank } from '@interfaces/services/bank'

export interface FakeBankLoginSettings {
    isActive: boolean
    bank: Bank
    authorizationUrl: string
    requestId: string
    bankIdUser: BankIdUser
    appVersions: Partial<Record<PlatformType, string>>
}

export interface FakeBankLoginSettingsModel extends FakeBankLoginSettings, Document {}
