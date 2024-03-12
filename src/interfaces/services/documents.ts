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
