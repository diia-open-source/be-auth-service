import { DocumentTypeCamelCase } from '@diia-inhouse/types'

import { GenderAsSex } from '@interfaces/services/authMethods'

export interface NfcUserDTO {
    docType: DocumentTypeCamelCase
    docSerie?: string
    docNumber: string
    firstName: string
    lastName: string
    middleName: string
    itn: string
    recordNumber: string
    birthDay: string
    gender: GenderAsSex
    photo?: string
    issuingState?: string
    international?: boolean
}
