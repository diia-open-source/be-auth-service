import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { AuthGetInnByUnzrRequest } from '@interfaces/services/nfc'

export default class NfcDataMapper {
    toEntity(data: NfcUserDTO): AuthGetInnByUnzrRequest {
        const { firstName, lastName, docNumber, recordNumber } = data

        return {
            person_unzr: recordNumber,
            representative_document: docNumber,
            representative_firstname: firstName,
            representative_lastname: lastName,
        }
    }
}
