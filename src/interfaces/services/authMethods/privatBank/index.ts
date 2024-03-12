import { GenderAsSex } from '@interfaces/services/authMethods'

export interface PrivatbankConfig {
    baseUrl: string
    version: string
    account: string
    secret: string
}

export interface PrivatBankUserDTO {
    fio: string
    name: string
    surname: string
    patronymic: string
    sex: GenderAsSex
    inn: string
    passport: string
    email: string
    phone: string
    address: string
    birthplace: string
    birthday: string
}

export interface AuthorizationUrlError {
    response: {
        data: string
    }
}
