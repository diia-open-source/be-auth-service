import { CryptoService, DocumentDecryptedData } from '@diia-inhouse/crypto'
import { BadRequestError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import AuthService from '@services/auth'
import DocumentsService from '@services/documents'
import NotificationService from '@services/notification'
import UserService from '@services/user'

import { AuthMethod, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { DocumentType } from '@interfaces/services/documents'
import { MessageTemplateCode } from '@interfaces/services/notification'
import { AuthSchemaStrategy, AuthStepsStatusToAuthMethodProcessCode, AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

export default class ResidencePermitNfcAddingStrategyService implements AuthSchemaStrategy {
    constructor(
        private readonly crypto: CryptoService,
        private readonly logger: Logger,

        private readonly authService: AuthService,
        private readonly documentsService: DocumentsService,
        private readonly notificationService: NotificationService,
        private readonly userService: UserService,
    ) {}

    readonly isUserRequired: boolean = true

    readonly completeOnSuccess?: boolean = true

    readonly authSchemaEndedChainProcessCode: ProcessCode = ProcessCode.WaitingPeriodHasExpiredNfc

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.Nfc]: ProcessCode.ResidencePermitAddedSuccessfully,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, headers, user } = options
        const { mobileUid } = headers

        if (!user) {
            throw new BadRequestError('User is not provided')
        }

        const { identifier: userIdentifier } = user

        this.logger.info('residencePermitNfcAdding has started')

        const userData: NfcUserDTO = <NfcUserDTO>await this.authService.verify(method, '', { headers, user })

        const residencePermitEncryptionData: DocumentDecryptedData = { id: userData.docNumber }
        const documentType = <DocumentType>utils.camelCaseToDocumentType(userData.docType)

        switch (method) {
            case AuthMethod.Nfc: {
                const { hashData, encryptedData } = await this.crypto.encryptData(residencePermitEncryptionData)

                await Promise.all([
                    this.userService.addDocumentInStorage(userIdentifier, documentType, hashData!, encryptedData),
                    this.documentsService.expireDocument(user, documentType),
                ])

                const hasDocumentInRegistry = await this.documentsService.hasDocumentInRegistry(documentType, user)

                await (hasDocumentInRegistry
                    ? this.notifyResidencePermitAdded(userIdentifier, documentType, mobileUid)
                    : this.notifyResidencePermitNotFound(userIdentifier, documentType, mobileUid))

                return []
            }
            default: {
                const unhandledMethod = method

                throw new TypeError(`Unhandled residence permit adding method: ${unhandledMethod}`)
            }
        }
    }

    private async notifyResidencePermitAdded(userIdentifier: string, documentType: DocumentType, mobileUid: string): Promise<void> {
        const templateCode =
            documentType === DocumentType.ResidencePermitPermanent
                ? MessageTemplateCode.ResidencePermitPermanentAdded
                : MessageTemplateCode.ResidencePermitTemporaryAdded

        await this.notificationService.createNotificationWithPushesByMobileUidSafe({
            userIdentifier,
            mobileUid,
            templateCode,
        })
    }

    private async notifyResidencePermitNotFound(userIdentifier: string, documentType: DocumentType, mobileUid: string): Promise<void> {
        const templateCode =
            documentType === DocumentType.ResidencePermitPermanent
                ? MessageTemplateCode.ResidencePermitPermanentNotFound
                : MessageTemplateCode.ResidencePermitTemporaryNotFound

        await this.notificationService.createNotificationWithPushesByMobileUidSafe({
            userIdentifier,
            mobileUid,
            templateCode,
        })
    }
}
