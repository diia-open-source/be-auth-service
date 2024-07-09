import { GenderAsSex } from '@interfaces/services/authMethods'
import { DocumentTypeCamelCase } from '@interfaces/services/documents'

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
