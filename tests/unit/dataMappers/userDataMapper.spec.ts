import { IdentifierService } from '@diia-inhouse/crypto'
import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { AuthDocumentType, DocumentTypeCamelCase, Gender } from '@diia-inhouse/types'

import AppUtils from '@src/utils'

import UserDataMapper from '@dataMappers/userDataMapper'

import { generateItn } from '@tests/mocks/randomData'

import { AuthMethod } from '@interfaces/models/authSchema'
import { AuthMethodVerifyResult, GenderAsPerson, GenderAsSex } from '@interfaces/services/authMethods'
import { BankIdDocumentType, BankIdUser } from '@interfaces/services/authMethods/bankId'
import { MonobankUserDTO } from '@interfaces/services/authMethods/monobank'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { PrivatBankUserDTO } from '@interfaces/services/authMethods/privatBank'
import { QesUserDTO } from '@interfaces/services/authMethods/qes'

describe('UserDataMapper', () => {
    const testKit = new TestKit()
    const identifierService = mockInstance(IdentifierService)
    const appUtils = new AppUtils(identifierService)
    const mapper = new UserDataMapper(appUtils)

    describe('method: `toEntity`', () => {
        test('should correctly map Monobank user', () => {
            const itn = generateItn()

            const mockMonoUser: MonobankUserDTO = {
                fName: 'Надія',
                lName: 'Дія',
                mName: 'Володимирівна',
                inn: itn,
                passportSeries: 'TT',
                passportNumber: '123456',
                email: 'test@test.com',
                phoneNumber: '+380999999999',
                addressOfRegistration: '',
                addressOfBirth: '',
                birthDay: '24.08.1991',
                gender: GenderAsPerson.Woman,
                clientId: '123456',
            }

            const result = mapper.toEntity(mockMonoUser)

            expect(result).toMatchObject({
                fName: 'Надія',
                lName: 'Дія',
                mName: 'Володимирівна',
                itn,
                gender: Gender.female,
                phoneNumber: '+380999999999',
                email: 'test@test.com',
                passport: 'TT123456',
                document: {
                    value: 'TT123456',
                    type: AuthDocumentType.ForeignPassport,
                },
                birthDay: '24.08.1991',
            })
        })

        test('should correctly map PrivatBank user', () => {
            const itn = generateItn()

            const mockPbUser: PrivatBankUserDTO = {
                fio: 'Дія Надія Володимирівна',
                name: 'Надія',
                surname: 'Дія',
                patronymic: 'Володимирівна',
                sex: GenderAsSex.F,
                inn: itn,
                passport: 'TT123456',
                email: 'test@test.com',
                phone: '+380999999999',
                address: '',
                birthplace: '',
                birthday: '24.08.1991',
            }

            const result = mapper.toEntity(mockPbUser)

            expect(result).toMatchObject({
                fName: 'Надія',
                lName: 'Дія',
                mName: 'Володимирівна',
                itn,
                gender: Gender.female,
                phoneNumber: '+380999999999',
                email: 'test@test.com',
                passport: 'TT123456',
                document: {
                    value: 'TT123456',
                    type: AuthDocumentType.ForeignPassport,
                },
                addressOfRegistration: '',
                addressOfBirth: '',
                birthDay: '24.08.1991',
            })
        })

        test('should correctly map BankId user without appropriate address type', () => {
            const itn = generateItn()

            const mockBankIdUser: BankIdUser = {
                type: '',
                firstName: 'Надія',
                lastName: 'Дія',
                middleName: 'n/a',
                sex: GenderAsSex.F,
                inn: itn,
                email: 'test@test.com',
                phone: '+380999999999',
                birthDay: '24.08.1991',
                addresses: [
                    {
                        type: '',
                        country: 'Україна',
                        state: '',
                        area: '',
                        city: '',
                        street: '',
                        houseNo: '',
                        flatNo: '',
                    },
                ],
                documents: [],
            }

            const result = mapper.toEntity(mockBankIdUser)

            expect(result).toMatchObject({
                fName: 'Надія',
                lName: 'Дія',
                mName: '',
                itn,
                gender: Gender.female,
                phoneNumber: '+380999999999',
                email: 'test@test.com',
                passport: '',
                addressOfRegistration: '',
                addressOfBirth: '',
                birthDay: '24.08.1991',
            })
        })

        test('should correctly map BankId user with address and without phone', () => {
            const itn = generateItn()

            const mockBankIdUser: BankIdUser = {
                type: '',
                firstName: 'Надія',
                lastName: 'Дія',
                middleName: 'Володимирівна',
                sex: GenderAsSex.F,
                inn: itn,
                email: '',
                phone: '',
                birthDay: '24.08.1991',
                addresses: [
                    {
                        type: 'factual',
                        country: 'Україна',
                        state: '',
                        area: 'Бориспільський район',
                        city: 'Бориспіль',
                        street: 'Вулиця Шевченка',
                        houseNo: '123',
                        flatNo: '456',
                    },
                ],
                documents: [],
            }

            const result = mapper.toEntity(mockBankIdUser)

            expect(result).toMatchObject({
                fName: 'Надія',
                lName: 'Дія',
                mName: 'Володимирівна',
                itn,
                gender: Gender.female,
                phoneNumber: '',
                email: '',
                passport: '',
                addressOfRegistration: 'Україна,  м. Бориспіль, ул./просп. Вулиця Шевченка, буд. 123, кв. 456',
                addressOfBirth: '',
                birthDay: '24.08.1991',
            })
        })

        test('should correctly map BankId user with documents', () => {
            const itn = generateItn()

            const mockBankIdUser: BankIdUser = {
                type: '',
                firstName: 'Надія',
                lastName: 'Дія',
                middleName: 'Володимирівна',
                sex: GenderAsSex.F,
                inn: itn,
                email: 'test@test.com',
                phone: '',
                birthDay: '24.08.1991',
                addresses: [],
                documents: [
                    {
                        type: BankIdDocumentType.ForeignPassport,
                        typeName: 'Foreign Passport',
                        series: 'FH',
                        number: '123456',
                        issue: 'Kyiv City Department of Consular Service',
                        dateIssue: '01.01.2015',
                        dateExpiration: '01.01.2030',
                        issueCountryIso2: 'UA',
                    },
                ],
            }

            const result = mapper.toEntity(mockBankIdUser)

            expect(result).toMatchObject({
                fName: 'Надія',
                lName: 'Дія',
                mName: 'Володимирівна',
                itn,
                gender: Gender.female,
                phoneNumber: '',
                email: 'test@test.com',
                passport: 'FH123456',
                document: {
                    value: 'FH123456',
                    type: AuthDocumentType.ForeignPassport,
                },
                addressOfRegistration: '',
                addressOfBirth: '',
                birthDay: '24.08.1991',
            })
        })

        test('should correctly map EResidency user', () => {
            const itn = generateItn()
            const eResidencyData = testKit.docs.getEResidency({
                itn,
                residenceApartment: '25',
                residenceBuilding: '10',
                residenceStreet: 'Khreshchatyk Street',
                patronymicEN: 'Martin',
            })

            const result = mapper.toEntity(eResidencyData)

            expect(result).toMatchObject({
                fName: 'John',
                lName: 'Doe',
                mName: 'Martin',
                itn,
                gender: Gender.male,
                phoneNumber: '+533443223431',
                email: 'john.doe@email.com',
                passport: '2222-111111',
                document: {
                    value: '2222-111111',
                    type: AuthDocumentType.EResidency,
                },
                birthDay: '12.05.1996',
                addressOfRegistration: 'Ukraine Kyiv Khreshchatyk Street 10 Apt 25',
                addressOfBirth: 'Slovakia Bratislava',
            })
        })

        test('should correctly map Qes user', () => {
            const itn = '0000100000'

            const mockBankIdUser: QesUserDTO = <QesUserDTO>{
                issuer: 'testissuer',
                issuerCn: 'testissuerCn',
                serial: 'TT123456',
                subject: 'testsubject',
                subjCn: 'Іваненко Іван Іванович',
                subjFullName: '',
                subjDrfoCode: itn,
                subjEdrpouCode: '00099999',
                authMethod: AuthMethod.Qes,
            }

            const result = mapper.toEntity(mockBankIdUser)

            expect(result).toMatchObject({
                fName: 'Іван',
                lName: 'Іваненко',
                mName: 'Іванович',
                itn,
                document: {
                    value: 'TT123456',
                    type: AuthDocumentType.QesKey,
                },
                edrpou: '00099999',
                birthDay: '01.01.1900',
                gender: Gender.female,
                addressOfBirth: '',
                addressOfRegistration: '',
                email: '',
                passport: '',
                phoneNumber: '',
            })
        })

        test('should throw BadRequestError if appropriate documentType is not provided', () => {
            const itn = '0000100000'

            const mockBankIdUser = {
                issuer: 'testissuer',
                issuerCn: 'testissuerCn',
                serial: 'TT123456',
                subject: 'testsubject',
                subjCn: 'testsubjCn',
                subjFullName: 'Іваненко Іван Іванович',
                subjDrfoCode: itn,
                authMethod: AuthMethod.EmailOtp,
            }

            expect(() => mapper.toEntity(<QesUserDTO>mockBankIdUser)).toThrow(BadRequestError)
        })

        test('should throw BadRequestError due to invalid user data', () => {
            const itn = 'wrong-itn'

            const mockBankIdUser: QesUserDTO = <QesUserDTO>{
                issuer: 'testissuer',
                issuerCn: 'testissuerCn',
                serial: 'TT123456',
                subject: 'testsubject',
                subjCn: 'testsubjCn',
                subjFullName: 'Іваненко Іван Іванович',
                subjDrfoCode: itn,
                authMethod: AuthMethod.Qes,
            }

            expect(() => mapper.toEntity(mockBankIdUser)).toThrow(BadRequestError)
        })

        test('should throw BadRequestError due to wrong third party provider user', () => {
            const wrongThirdPartyProviderUser = {
                fname: 'Test',
                lName: 'User',
            }

            expect(() => mapper.toEntity(<AuthMethodVerifyResult>(<unknown>wrongThirdPartyProviderUser))).toThrow(BadRequestError)
        })
    })

    describe('method: `fromNfcToEntity`', () => {
        test('should correctly map Nfc user data', () => {
            const itn = generateItn()

            const mockNfcUser: NfcUserDTO = {
                docType: DocumentTypeCamelCase.idCard,
                docSerie: '',
                docNumber: '123456789',
                firstName: 'Надія',
                lastName: 'Дія',
                middleName: 'Володимирівна',
                itn,
                recordNumber: '',
                birthDay: '24.08.1991',
                gender: GenderAsSex.F,
            }

            const result = mapper.toEntity(mockNfcUser)

            expect(result).toMatchObject({
                fName: 'Надія',
                lName: 'Дія',
                mName: 'Володимирівна',
                itn,
                passport: '123456789',
                document: {
                    value: '123456789',
                    type: AuthDocumentType.IdCard,
                },
                birthDay: '24.08.1991',
                gender: Gender.female,
            })
        })

        test('should correctly map Nfc user data with unknown document type', () => {
            const itn = generateItn()

            const mockNfcUser: NfcUserDTO = {
                docType: DocumentTypeCamelCase.idCard,
                docSerie: '',
                docNumber: '1234567890',
                firstName: 'Надія',
                lastName: 'Дія',
                middleName: 'Володимирівна',
                itn,
                recordNumber: '',
                birthDay: '24.08.1991',
                gender: GenderAsSex.F,
            }

            const result = mapper.toEntity(mockNfcUser)

            expect(result).toMatchObject({
                fName: 'Надія',
                lName: 'Дія',
                mName: 'Володимирівна',
                itn,
                passport: '1234567890',
                document: {
                    value: '1234567890',
                    type: 'unknown',
                },
                birthDay: '24.08.1991',
                gender: Gender.female,
            })
        })
    })
})
