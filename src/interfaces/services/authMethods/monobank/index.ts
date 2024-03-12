import { GenderAsPerson } from '@interfaces/services/authMethods'

export interface MonobankConfig {
    APIToken: string
    pathToPrivateKey: string
    baseUrl: string
}

export interface MonobankUserDTO {
    fName: string
    lName: string
    mName: string
    inn: string
    passportSeries: string
    passportNumber: string
    email: string
    phoneNumber: string
    addressOfRegistration: string
    addressOfBirth: string
    birthDay: string
    gender: GenderAsPerson
    clientId: string
}

export interface MonoAuthHeaders {
    endpoint: string
    requestId?: string
    permissions?: string[]
}

export interface MonoHeaders {
    [key: string]: string
}
