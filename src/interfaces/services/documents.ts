import { DocumentsMetaData } from '@diia-inhouse/types'

export interface CheckPassportResult {
    exists: boolean
}

export interface EResidencyCountryInfo {
    code: number
    alpha2: string
    alpha3: string
    nameEng: string
    nameLong: string
    nameShort: string
    isCountryResidence: boolean
}

export enum DocumentType {
    InternalPassport = 'internal-passport',
    ForeignPassport = 'foreign-passport',
    ResidencePermitPermanent = 'residence-permit-permanent',
    ResidencePermitTemporary = 'residence-permit-temporary',
    EResidency = 'e-residency',
    TaxpayerCard = 'taxpayer-card',
    DriverLicense = 'driver-license',
}

export enum DocumentTypeCamelCase {
    idCard = 'idCard',
    foreignPassport = 'foreignPassport',
    residencePermitPermanent = 'residencePermitPermanent',
    residencePermitTemporary = 'residencePermitTemporary',
    eResidentPassport = 'eResidentPassport',
    eResidency = 'eResidency',
}

export enum ResidentshipStatus {
    NotActive = 0,
    Active = 1,
    Terminated = 2,
}

export interface EResidency extends DocumentsMetaData {
    documentType?: DocumentType.EResidency
    birthCityEN: string
    birthCityUA: string
    birthCountryCode: string
    birthCountryEN: string
    birthCountryUA: string
    birthDate: string
    citizenshipCountryCode: string
    citizenshipCountryEN: string
    citizenshipCountryUA: string
    docNumber: string
    email: string
    expireDate: string
    firstNameEN: string
    firstNameUA: string
    gender: string
    id: string
    issueDate: string
    itn: string
    lastNameEN: string
    lastNameUA: string
    passportDocNumber: string
    patronymicEN?: string
    patronymicUA?: string
    phoneNumber: string
    residentshipStatus: ResidentshipStatus
    residenceApartment?: string
    residenceBuilding: string
    residenceCityEN: string
    residenceCityUA: string
    residenceCountryCode: string
    residenceCountryEN: string
    residenceCountryUA: string
    residencePostalCode?: string
    residenceStreet: string
    signature: string
}
