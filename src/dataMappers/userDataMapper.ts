import { BadRequestError } from '@diia-inhouse/errors'
import { AuthDocument, AuthDocumentType, Gender, User } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import Utils from '@src/utils'

import { AuthMethod } from '@interfaces/models/authSchema'
import { AuthMethodVerifyResult, GenderAsPerson, GenderAsSex } from '@interfaces/services/authMethods'
import { BankIdAddress, BankIdDocument, BankIdDocumentType, BankIdUser } from '@interfaces/services/authMethods/bankId'
import { MonobankUserDTO } from '@interfaces/services/authMethods/monobank'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { PrivatBankUserDTO } from '@interfaces/services/authMethods/privatBank'
import { QesUserDTO } from '@interfaces/services/authMethods/qes'
import { EResidency } from '@interfaces/services/documents'

export default class UserDataMapper {
    constructor(private readonly appUtils: Utils) {}

    private readonly notAvailableValue = 'n/a'

    private readonly qesAuthMethodToDocumentType: Partial<Record<AuthMethod, AuthDocumentType>> = {
        [AuthMethod.Qes]: AuthDocumentType.QesKey,
        [AuthMethod.Ds]: AuthDocumentType.Ds,
    }

    toEntity(userFromThirdPartyProvider: AuthMethodVerifyResult): User {
        if (this.isMonoUser(<MonobankUserDTO>userFromThirdPartyProvider)) {
            return this.monoUserToUser(<MonobankUserDTO>userFromThirdPartyProvider)
        }

        if (this.isPbUser(<PrivatBankUserDTO>userFromThirdPartyProvider)) {
            return this.pbUserToUser(<PrivatBankUserDTO>userFromThirdPartyProvider)
        }

        if (this.isBankIdUser(<BankIdUser>userFromThirdPartyProvider)) {
            return this.bankIdUserToUser(<BankIdUser>userFromThirdPartyProvider)
        }

        if (this.isNfcUser(<NfcUserDTO>userFromThirdPartyProvider)) {
            return this.fromNfcToEntity(<NfcUserDTO>userFromThirdPartyProvider)
        }

        if (this.isEResidencyUser(<EResidency>userFromThirdPartyProvider)) {
            return this.fromEResidencyDataToEntity(<EResidency>userFromThirdPartyProvider)
        }

        if (this.isQesUser(<QesUserDTO>userFromThirdPartyProvider)) {
            return this.fromQesToEntity(<QesUserDTO>userFromThirdPartyProvider)
        }

        throw new BadRequestError('Invalid user data', { userFromThirdPartyProvider })
    }

    fromNfcToEntity(user: NfcUserDTO): User {
        const documentValue: string = `${user.docSerie || ''}${user.docNumber}`.trim()
        const documentType: AuthDocumentType = this.appUtils.getDocumentType(documentValue)

        return <User>{
            fName: utils.capitalizeName(user.firstName),
            lName: utils.capitalizeName(user.lastName),
            mName: utils.capitalizeName(user.middleName),
            itn: user.itn,
            passport: documentValue,
            document: {
                value: documentValue,
                type: documentType,
            },
            birthDay: this.appUtils.normalizeBirthDay(user.birthDay),
            gender: this.getGenderFromSex(user.gender),
        }
    }

    private isMonoUser(user: MonobankUserDTO): boolean {
        return user.passportSeries !== undefined && user.addressOfRegistration !== undefined
    }

    private isPbUser(user: PrivatBankUserDTO): boolean {
        return user.fio !== undefined && user.birthplace !== undefined
    }

    private isBankIdUser(user: BankIdUser): boolean {
        return (
            // (user as BankIdUser).type === 'physical' && //commented because some banks do not return this field
            user.addresses !== undefined && user.documents !== undefined
        )
    }

    private isNfcUser(user: NfcUserDTO): boolean {
        return user.docType !== undefined && user.docNumber !== undefined
    }

    private isEResidencyUser(data: EResidency): boolean {
        return (
            data.residenceCountryEN !== undefined ||
            data.residenceCityEN !== undefined ||
            data.residenceStreet !== undefined ||
            data.residenceApartment !== undefined
        )
    }

    private isQesUser(user: QesUserDTO): boolean {
        return user.serial !== undefined && user.issuer !== undefined && user.subject !== undefined
    }

    private fromQesToEntity(data: QesUserDTO): User {
        const itn = data.subjDrfoCode
        const fullName = data.subjFullName || data.subjCn
        const documentType = this.qesAuthMethodToDocumentType[data.authMethod]
        if (!itn || !utils.isItnFormatValid(itn) || !fullName) {
            throw new BadRequestError('Invalid user data', { data })
        }

        if (!documentType) {
            throw new BadRequestError('Unknown auth method', { authMethod: data.authMethod })
        }

        const birthDay = utils.getBirthDayFromItn(itn)
        const gender = utils.getGenderFromItn(itn)
        const parsedFullName = utils.capitalizeName(fullName).split(' ')
        const edrpou = data.subjEdrpouCode
        const [lName, fName, mName] = parsedFullName
        const user: User = {
            fName,
            lName,
            mName,
            itn,
            ...(edrpou && { edrpou }),
            document: {
                type: documentType,
                value: data.serial,
            },
            birthDay,
            gender,
            addressOfBirth: '',
            addressOfRegistration: '',
            email: '',
            passport: '',
            phoneNumber: '',
        }

        return user
    }

    private fromEResidencyDataToEntity(data: EResidency): User {
        return {
            fName: utils.capitalizeName(data.firstNameEN),
            lName: utils.capitalizeName(data.lastNameEN),
            mName: data.patronymicEN ? utils.capitalizeName(data.patronymicEN) : '',
            itn: data.itn,
            gender: this.getGenderFromSex(data.gender),
            phoneNumber: data.phoneNumber,
            email: data.email,
            passport: data.passportDocNumber,
            document: {
                value: data.passportDocNumber,
                type: AuthDocumentType.EResidency,
            },
            birthDay: data.birthDate,
            addressOfRegistration:
                `${data.residenceCountryEN} ` +
                `${data.residenceCityEN} ` +
                `${data.residenceStreet} ` +
                `${data.residenceBuilding}` +
                (data.residenceApartment ? ` Apt ${data.residenceApartment}` : ''),
            addressOfBirth: `${data.birthCountryEN} ${data.birthCityEN}`,
        }
    }

    private monoUserToUser(user: MonobankUserDTO): User {
        const documentValue = `${user.passportSeries}${user.passportNumber}`
        const documentType: AuthDocumentType = this.appUtils.getDocumentType(documentValue)
        const document: AuthDocument = {
            value: this.appUtils.normalizeDocumentValue(documentValue, documentType),
            type: documentType,
        }

        return {
            fName: utils.capitalizeName(user.fName),
            lName: utils.capitalizeName(user.lName),
            mName: utils.capitalizeName(user.mName),
            itn: user.inn,
            gender: this.getGenderFromPerson(user.gender),
            phoneNumber: user.phoneNumber,
            email: user.email,
            passport: document.value,
            document,
            addressOfRegistration: user.addressOfRegistration,
            addressOfBirth: user.addressOfBirth,
            birthDay: this.appUtils.normalizeBirthDay(user.birthDay),
            bankUserId: user.clientId,
        }
    }

    private pbUserToUser(user: PrivatBankUserDTO): User {
        const documentValue: string = user.passport.replace('null', '')
        const documentType: AuthDocumentType = this.appUtils.getDocumentType(documentValue)
        const document: AuthDocument = {
            value: this.appUtils.normalizeDocumentValue(documentValue, documentType),
            type: documentType,
        }

        return {
            fName: utils.capitalizeName(user.name),
            lName: utils.capitalizeName(user.surname),
            mName: utils.capitalizeName(user.patronymic),
            itn: user.inn,
            gender: this.getGenderFromSex(user.sex),
            phoneNumber: user.phone || '',
            email: user.email || '',
            passport: document.value,
            document,
            addressOfRegistration: user.address,
            addressOfBirth: user.birthplace,
            birthDay: this.appUtils.normalizeBirthDay(user.birthday),
        }
    }

    private bankIdUserToUser(user: BankIdUser): User {
        const regAddr = user.addresses.find((address: BankIdAddress) => address.type === 'juridical')
        const factAddr = user.addresses.find((address: BankIdAddress) => address.type === 'factual')
        const passport = user.documents.find((doc: BankIdDocument) => doc.type === BankIdDocumentType.Passport)
        const idpassport = user.documents.find((doc: BankIdDocument) => doc.type === BankIdDocumentType.IdPassport)
        const zpassport = user.documents.find((doc: BankIdDocument) => doc.type === BankIdDocumentType.ForeignPassport)
        const ident = user.documents.find((doc: BankIdDocument) => doc.type === BankIdDocumentType.Ident)
        const bankIdDocument = passport || idpassport || zpassport || ident

        const documentValue = this.getPassport(bankIdDocument)
        const documentType: AuthDocumentType = bankIdDocument?.type
            ? this.appUtils.getDocumentTypeBankId(bankIdDocument.type, documentValue)
            : AuthDocumentType.Unknown
        const document: AuthDocument = {
            value: this.appUtils.normalizeDocumentValue(documentValue, documentType),
            type: documentType,
        }

        return {
            fName: utils.capitalizeName(user.firstName),
            lName: utils.capitalizeName(user.lastName),
            mName: user.middleName === this.notAvailableValue ? '' : utils.capitalizeName(user.middleName),
            itn: user.inn,
            gender: this.getGenderFromSex(user.sex),
            phoneNumber: this.getPhoneNumber(user.phone),
            email: user.email || '',
            passport: document.value,
            document,
            addressOfRegistration: this.getAddress(factAddr || regAddr),
            addressOfBirth: '',
            birthDay: this.appUtils.normalizeBirthDay(user.birthDay),
        }
    }

    private getGenderFromSex(genderAsSex: string): Gender {
        return genderAsSex === GenderAsSex.M ? Gender.male : Gender.female
    }

    private getGenderFromPerson(genderAsPerson: GenderAsPerson): Gender {
        return genderAsPerson === GenderAsPerson.Man ? Gender.male : Gender.female
    }

    private getPassport(doc: BankIdDocument | undefined): string {
        return doc ? `${doc.series?.replace(this.notAvailableValue, '') || ''}${doc.number}`.trim() : ''
    }

    private getAddress(address: BankIdAddress | undefined): string {
        return address
            ? // eslint-disable-next-line max-len
              `${address.country}, ${address.state ? `обл. ${address.state},` : ''} ${address.city ? `м. ${address.city},` : ''} ${
                  address.street ? `ул./просп. ${address.street},` : ''
              } ${address.houseNo ? `буд. ${address.houseNo},` : ''} ${address.flatNo ? `кв. ${address.flatNo}` : ''}`
            : ''
    }

    private getPhoneNumber(phoneNumber: string | undefined): string {
        const phoneNumbersMask = ['380000000000']

        if (!phoneNumber || phoneNumbersMask.includes(phoneNumber)) {
            return ''
        }

        return phoneNumber
    }
}
