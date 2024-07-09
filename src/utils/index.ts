import { randomInt } from 'node:crypto'

import moment from 'moment'

import { IdentifierService } from '@diia-inhouse/crypto'
import { AuthDocument, AuthDocumentType, AuthEntryPoint } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import { AuthMethod } from '@interfaces/models/authSchema'
import { BankIdDocumentType } from '@interfaces/services/authMethods/bankId'

export default class Utils {
    constructor(private readonly identifier: IdentifierService) {}

    private readonly dateFormats: string[] = [
        'DD.MM.YYYY',
        'DD-MM-YYYY',
        'DD/MM/YYYY',
        'DD,MM,YYYY',
        'MM-DD-YY',
        'YYYY-MM-DD',
        'YYYY.MM.DD',
    ]

    private defaultFormat = 'DD.MM.YYYY'

    normalizeBirthDay(birthDay: string): string {
        const dateFormat = this.findDateFormat(birthDay)

        return dateFormat ? moment.utc(birthDay, dateFormat).format(this.defaultFormat) : birthDay
    }

    findDateFormat(value: string): string | undefined {
        return this.dateFormats.find((format: string) => {
            const date = moment.utc(value, format, true)

            return date.isValid()
        })
    }

    normalizeDocumentValue(documentValue: string, documentType: AuthDocumentType): string {
        if ([AuthDocumentType.TemporaryResidencePermit, AuthDocumentType.PermanentResidencePermit].includes(documentType)) {
            return utils.mapLatin(documentValue)
        }

        return documentValue
    }

    getDocumentType(document: string): AuthDocumentType {
        if (/^8\d{8}$/.test(document) || /^[tт][pр]\d{6}$/i.test(document)) {
            return AuthDocumentType.TemporaryResidencePermit
        }

        if (/^9\d{8}$/.test(document) || /^[iі][hн]\d{6}$/i.test(document)) {
            return AuthDocumentType.PermanentResidencePermit
        }

        if (/^\d{9}$/.test(document)) {
            return AuthDocumentType.IdCard
        }

        if (/^[a-z]{2}\d{6}$/i.test(document)) {
            return AuthDocumentType.ForeignPassport
        }

        if (/^[а-я]{2}\d{6}$/i.test(document)) {
            return AuthDocumentType.PaperInternalPassport
        }

        if (/^.-[а-я]{2}\d{6}$/i.test(document)) {
            return AuthDocumentType.BirthCertificate
        }

        return AuthDocumentType.Unknown
    }

    getDocumentTypeBankId(type: BankIdDocumentType, value: string): AuthDocumentType {
        if (type === BankIdDocumentType.Passport) {
            return AuthDocumentType.PaperInternalPassport
        }

        if (type === BankIdDocumentType.IdPassport) {
            return AuthDocumentType.IdCard
        }

        if (type === BankIdDocumentType.ForeignPassport) {
            return AuthDocumentType.ForeignPassport
        }

        return this.getDocumentType(value)
    }

    async generateChannelUuid(userIdentifier: string): Promise<string> {
        return this.identifier.createIdentifier(userIdentifier)
    }

    getAuthEntryPoint(method: AuthMethod, document?: AuthDocument, bankId?: string): AuthEntryPoint {
        const isBankId: boolean = method === AuthMethod.BankId
        let bankName

        if ([AuthMethod.BankId, AuthMethod.PrivatBank, AuthMethod.Monobank].includes(method)) {
            bankName = isBankId ? bankId : method
        }

        const authEntryPoint: AuthEntryPoint = {
            target: method,
            bankName,
            isBankId,
            document: document && document.type,
        }

        return authEntryPoint
    }

    getAge(birthDay: string, format = 'DD.MM.YYYY'): number {
        const birthdayDate = moment(birthDay, format)
        if (!birthdayDate.isValid()) {
            throw new Error('Invalid user birthday')
        }

        const age: number = moment().diff(birthdayDate, 'years')

        return age
    }

    generateOtp(length: number): string {
        return Array.from({ length }, () => randomInt(0, 10)).join('')
    }
}
