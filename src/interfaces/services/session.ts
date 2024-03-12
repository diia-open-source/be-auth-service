import { ActHeaders } from '@diia-inhouse/types'

export enum AuthType {
    BankId = 'bankId',
    BankApp = 'bankApp',
    Nfc = 'nfc',
    Qes = 'qes',
    Ds = 'ds',
    Test = 'test',
    EmailOtp = 'email-otp',
    EResidentQrCode = 'e-resident-qr-code',
    EResidentMrz = 'e-resident-mrz',
    EResidentNfc = 'e-resident-nfc',
}

export interface Session {
    id: string
    status: boolean
    platform: {
        type: string
        version: string
    }
    appVersion: string
    auth: {
        type: AuthType
        bank?: string
        document?: string
        creationDate: string
        lastActivityDate: string
    }
}

export interface SessionWithActions extends Session {
    action: {
        sharing: {
            name: string
            badge?: number
        }
        signing: {
            name: string
            badge?: number
        }
    }
}

export type SessionServiceHeaderParams = Required<Pick<ActHeaders, 'platformType' | 'appVersion'>>
