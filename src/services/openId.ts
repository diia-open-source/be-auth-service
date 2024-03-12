import { UserOpenIdData } from '@generated/auth'

import { AuthService as AuthCryptoService } from '@diia-inhouse/crypto'
import { AccessDeniedError } from '@diia-inhouse/errors'
import { DocumentType, SessionType } from '@diia-inhouse/types'

import UserService from '@services/user'

import { AppConfig } from '@interfaces/config'

export default class OpenIdService {
    constructor(
        private readonly auth: AuthCryptoService,
        private readonly userService: UserService,
        private readonly config: AppConfig,
    ) {}

    async getUserOpenIdDetails(token: string): Promise<UserOpenIdData> {
        const tokenData = await this.auth.validate(token, SessionType.User)
        const userDocuments = await this.userService.getUserDocuments(tokenData.identifier)

        let unzr: string | undefined

        let userHasValidRnokpp = false

        for (const doc of userDocuments.documents) {
            if ([DocumentType.ForeignPassport, DocumentType.InternalPassport].includes(doc.documentType) && !unzr) {
                if (doc.docId) {
                    unzr = doc.docId.substring(0, 10)
                }
            }

            if (doc.documentType === DocumentType.TaxpayerCard) {
                userHasValidRnokpp = true
            }
        }

        if (this.config.openid.enableDocumentsCheck) {
            if (!userHasValidRnokpp) {
                throw new AccessDeniedError('user does not have a valid rnokpp', undefined, 12201003)
            }

            if (!unzr) {
                throw new AccessDeniedError('user does not have a valid passport', undefined, 12201003)
            }
        }

        const {
            email,
            fName: firstName,
            lName: lastName,
            mName: givenName,
            itn: rnokpp,
            identifier: userIdentifier,
            gender,
            birthDay,
            phoneNumber,
        } = tokenData

        return {
            email,
            firstName,
            lastName,
            givenName,
            rnokpp,
            userIdentifier,
            gender,
            birthDay,
            phoneNumber,
            unzr,
        }
    }
}
