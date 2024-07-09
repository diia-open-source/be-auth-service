import NfcDataMapper from '@dataMappers/nfcDataMapper'

import { GenderAsSex } from '@interfaces/services/authMethods'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { DocumentTypeCamelCase } from '@interfaces/services/documents'

describe('NfcDataMapper', () => {
    const mapper = new NfcDataMapper()

    const mockNfcUserDTO: NfcUserDTO = {
        docType: DocumentTypeCamelCase.eResidentPassport,
        docNumber: '123456789',
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Middle',
        itn: '1234567890',
        recordNumber: '987654321',
        birthDay: '1990-01-01',
        gender: GenderAsSex.M,
        photo: 'base64photo',
        issuingState: 'US',
        international: true,
    }

    describe('method: `toEntity`', () => {
        test('should map NfcUserDTO to AuthGetInnByUnzrRequest interface', () => {
            const result = mapper.toEntity(mockNfcUserDTO)

            expect(result).toEqual({
                person_unzr: '987654321',
                representative_document: '123456789',
                representative_firstname: 'John',
                representative_lastname: 'Doe',
            })
        })

        test('should correctly map non-international user', () => {
            const nonInternationalUser = {
                ...mockNfcUserDTO,
                international: false,
            }

            const result = mapper.toEntity(nonInternationalUser)

            expect(result).toEqual({
                person_unzr: '987654321',
                representative_document: '123456789',
                representative_firstname: 'John',
                representative_lastname: 'Doe',
            })
        })

        test('should exclude optional fields when not provided', () => {
            const minimalUser = {
                docType: DocumentTypeCamelCase.eResidentPassport,
                docNumber: '123456789',
                firstName: 'John',
                lastName: 'Doe',
                middleName: 'Middle',
                itn: '1234567890',
                recordNumber: '987654321',
                birthDay: '1990-01-01',
                gender: GenderAsSex.M,
            }

            const result = mapper.toEntity(minimalUser)

            expect(result).toEqual({
                person_unzr: '987654321',
                representative_document: '123456789',
                representative_firstname: 'John',
                representative_lastname: 'Doe',
            })
        })
    })
})
