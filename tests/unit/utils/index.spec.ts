import { randomUUID } from 'crypto'

const mapLatin = jest.fn()
const momentStubs: Record<string, jest.Mock> = {
    moment: jest.fn(() => momentStubs),
    format: jest.fn(() => momentStubs),
    diff: jest.fn(),
    isValid: jest.fn(),
}
function momentMock(...rest: unknown[]): Record<string, jest.MockableFunction> {
    momentStubs.moment(...rest)

    return momentStubs
}

momentMock.utc = jest.fn()

jest.mock('moment', () => momentMock)
jest.mock('@diia-inhouse/utils', () => ({ utils: { mapLatin } }))

import { IdentifierService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { AuthDocument, AuthDocumentType, AuthEntryPoint } from '@diia-inhouse/types'

import Utils from '@src/utils'

import { AuthMethod } from '@interfaces/models/authSchema'
import { BankIdDocumentType } from '@interfaces/services/authMethods/bankId'

describe(`${Utils.name}`, () => {
    const identifierServiceMock = mockInstance(IdentifierService)
    const testKit = new TestKit()
    const utils = new Utils(identifierServiceMock)

    describe(`method: ${utils.normalizeBirthDay.name}`, () => {
        it('should transform birthday into default format in case input format found', () => {
            const inputDate = '14-07-1997'
            const expectedDate = '14.07.1997'

            momentStubs.isValid.mockReturnValue(true)
            momentStubs.format.mockReturnValue(expectedDate)
            momentMock.utc.mockReturnValue(momentStubs)

            expect(utils.normalizeBirthDay(inputDate)).toEqual(expectedDate)
            expect(momentMock.utc).toHaveBeenCalledWith(inputDate, 'DD.MM.YYYY', true)
            expect(momentMock.utc).toHaveBeenCalledWith(inputDate, 'DD.MM.YYYY')
            expect(momentStubs.format).toHaveBeenCalledWith('DD.MM.YYYY')
        })

        it('should return birthday as is in case input format not found', () => {
            const inputDate = '14-07-1997'
            const expectedDate = inputDate

            momentStubs.isValid.mockReturnValue(false)
            momentMock.utc.mockReturnValue(momentStubs)

            expect(utils.normalizeBirthDay(inputDate)).toEqual(expectedDate)
        })
    })

    describe(`method: ${utils.normalizeDocumentValue.name}`, () => {
        const authDocumentTypesToMap: AuthDocumentType[] = [
            AuthDocumentType.TemporaryResidencePermit,
            AuthDocumentType.PermanentResidencePermit,
        ]

        it(`should return document value as it is in case document type is not one of ${authDocumentTypesToMap}`, () => {
            const expectedResult = 'document-value'
            const documentValue = 'document-value'

            mapLatin.mockReturnValueOnce('unexpected-document-value')

            expect(utils.normalizeDocumentValue(documentValue, AuthDocumentType.IdCard)).toEqual(expectedResult)
            expect(mapLatin).not.toHaveBeenCalledWith(documentValue)
        })

        it(`should successfully map to latin document value in case document type is one of ${authDocumentTypesToMap}`, () => {
            const expectedResult = 'znachennia-dokumenta'
            const documentValue = 'значення-документа'

            mapLatin.mockReturnValueOnce(expectedResult)

            expect(utils.normalizeDocumentValue(documentValue, authDocumentTypesToMap[0])).toEqual(expectedResult)
            expect(mapLatin).toHaveBeenCalledWith(documentValue)
        })
    })

    describe(`method: ${utils.getDocumentType.name}`, () => {
        it.each([
            [AuthDocumentType.TemporaryResidencePermit, '800000000'],
            [AuthDocumentType.TemporaryResidencePermit, 'tp000000'],
            [AuthDocumentType.TemporaryResidencePermit, 'тр000000'],
            [AuthDocumentType.PermanentResidencePermit, '900000000'],
            [AuthDocumentType.PermanentResidencePermit, 'ih000000'],
            [AuthDocumentType.PermanentResidencePermit, 'ін000000'],
            [AuthDocumentType.IdCard, '100000000'],
            [AuthDocumentType.ForeignPassport, 'UA000000'],
            [AuthDocumentType.PaperInternalPassport, 'СЕ000000'],
            [AuthDocumentType.BirthCertificate, 'А-СЕ000000'],
            [AuthDocumentType.Unknown, 'unknown'],
        ])('should return auth document type %s in case document is %s', (expectedType: AuthDocumentType, inputDocumentValue: string) => {
            expect(utils.getDocumentType(inputDocumentValue)).toEqual(expectedType)
        })
    })

    describe(`method: ${utils.getDocumentTypeBankId.name}`, () => {
        it.each([
            [AuthDocumentType.PaperInternalPassport, BankIdDocumentType.Passport, 'no-matter'],
            [AuthDocumentType.IdCard, BankIdDocumentType.IdPassport, 'no-matter'],
            [AuthDocumentType.ForeignPassport, BankIdDocumentType.ForeignPassport, 'no-matter'],
            [AuthDocumentType.IdCard, BankIdDocumentType.Ident, '100000000'],
            [AuthDocumentType.BirthCertificate, <BankIdDocumentType>'any-other', 'А-СЕ000000'],
            [AuthDocumentType.Unknown, <BankIdDocumentType>'unknown', 'unknown'],
        ])(
            'should return auth document type %s in case bankId document type is %s and document value is %s',
            (expectedType: AuthDocumentType, inputBankIdDocumentType: BankIdDocumentType, inputDocumentValue: string) => {
                expect(utils.getDocumentTypeBankId(inputBankIdDocumentType, inputDocumentValue)).toEqual(expectedType)
            },
        )
    })

    describe(`method: ${utils.generateChannelUuid.name}`, () => {
        it('should successfully generate', async () => {
            const {
                user: { identifier: userIdentifier },
            } = testKit.session.getUserSession()
            const expectedChannelUuid = randomUUID()

            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValue(expectedChannelUuid)

            expect(await utils.generateChannelUuid(userIdentifier)).toEqual(expectedChannelUuid)
            expect(identifierServiceMock.createIdentifier).toHaveBeenCalledWith(userIdentifier)
        })
    })

    describe(`method: ${utils.getAuthEntryPoint.name}`, () => {
        it.each([
            [
                AuthMethod.BankId,
                <AuthDocument>{ type: AuthDocumentType.IdCard, value: '100000000' },
                'bankId',
                <AuthEntryPoint>{
                    target: AuthMethod.BankId,
                    bankName: 'bankId',
                    isBankId: true,
                    document: AuthDocumentType.IdCard,
                },
            ],
            [
                AuthMethod.PrivatBank,
                <AuthDocument>{ type: AuthDocumentType.IdCard, value: '100000000' },
                'privatbank',
                <AuthEntryPoint>{
                    target: AuthMethod.PrivatBank,
                    bankName: AuthMethod.PrivatBank,
                    isBankId: false,
                    document: AuthDocumentType.IdCard,
                },
            ],
            [
                AuthMethod.Monobank,
                <AuthDocument>{ type: AuthDocumentType.IdCard, value: '100000000' },
                'monobank',
                <AuthEntryPoint>{
                    target: AuthMethod.Monobank,
                    bankName: AuthMethod.Monobank,
                    isBankId: false,
                    document: AuthDocumentType.IdCard,
                },
            ],
            [
                AuthMethod.Nfc,
                <AuthDocument>{ type: AuthDocumentType.IdCard, value: '100000000' },
                '',
                <AuthEntryPoint>{
                    target: AuthMethod.Nfc,
                    isBankId: false,
                    document: AuthDocumentType.IdCard,
                },
            ],
        ])(
            'should successfully return auth entry point in case method = %s, document = %s, bankId = %s',
            (method: AuthMethod, document: AuthDocument, bankId: string, expectResult: AuthEntryPoint) => {
                expect(utils.getAuthEntryPoint(method, document, bankId)).toEqual(expectResult)
            },
        )
    })

    describe(`method: ${utils.getAge.name}`, () => {
        it('should fail to get age in case date format is invalid', () => {
            const inputDate = 'invalidDate'

            momentStubs.moment.mockReturnValue(momentStubs)
            momentStubs.isValid.mockReturnValue(false)

            expect(() => {
                utils.getAge(inputDate)
            }).toThrow(new Error('Invalid user birthday'))
            expect(momentStubs.moment).toHaveBeenCalledWith(inputDate, 'DD.MM.YYYY')
            expect(momentStubs.isValid).toHaveBeenCalledWith()
        })

        it('should successfully return age in case date format is valid', () => {
            const inputDate = '13-11-1998'

            momentStubs.moment.mockReturnValue(momentStubs)
            momentStubs.isValid.mockReturnValue(true)
            momentStubs.diff.mockReturnValue(20)

            expect(utils.getAge(inputDate, 'DD-MM-YYYY')).toBe(20)
            expect(momentStubs.moment).toHaveBeenCalledWith(inputDate, 'DD-MM-YYYY')
            expect(momentStubs.isValid).toHaveBeenCalledWith()
            expect(momentStubs.diff).toHaveBeenCalledWith(momentStubs, 'years')
        })
    })

    describe(`method: ${utils.generateOtp.name}`, () => {
        it.each([10, 5, 6, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])('should generate otp length of %s', (otpLength: number) => {
            const otp = utils.generateOtp(otpLength)
            const regexp = new RegExp(`^\\d{${otpLength}}$`)

            expect(regexp.test(otp)).toBeTruthy()
        })
    })
})
