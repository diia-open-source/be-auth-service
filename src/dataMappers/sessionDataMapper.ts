import moment from 'moment'

import { IdentifierService } from '@diia-inhouse/crypto'
import { InternalServerError } from '@diia-inhouse/errors'
import { I18nService } from '@diia-inhouse/i18n'
import { AuthDocumentType } from '@diia-inhouse/types'

import { Locales } from '@interfaces/locales'
import { AuthMethod } from '@interfaces/models/authSchema'
import { AuthEntryPointHistory, RefreshTokenModel } from '@interfaces/models/refreshToken'
import { AuthType, Session, SessionWithActions } from '@interfaces/services/session'
import { testTarget } from '@interfaces/services/test'

export default class SessionDataMapper {
    constructor(
        private readonly identifier: IdentifierService,
        private readonly i18nService: I18nService<Locales>,
    ) {}

    private readonly authProviderToAuthType: Map<string, AuthType> = new Map([
        [AuthMethod.BankId, AuthType.BankId],
        [AuthMethod.Monobank, AuthType.BankApp],
        [AuthMethod.PrivatBank, AuthType.BankApp],
        [AuthMethod.Nfc, AuthType.Nfc],
        [AuthMethod.Qes, AuthType.Qes],
        [AuthMethod.Ds, AuthType.Ds],
        [AuthMethod.EmailOtp, AuthType.EmailOtp],
        [AuthMethod.EResidentQrCode, AuthType.EResidentQrCode],
        [AuthMethod.EResidentNfc, AuthType.EResidentNfc],
        [AuthMethod.EResidentMrz, AuthType.EResidentMrz],
        [testTarget, AuthType.Test],
    ])

    private readonly nfcDocumentToName: Partial<Record<string, string>> = {
        [AuthDocumentType.IdCard]: 'ID карта',
        [AuthDocumentType.ForeignPassport]: 'Біометричний паспорт громадянина для перетину кордону',
    }

    private readonly dateFormat: string = 'DD.MM.YYYY / HH:mm'

    toEntity(refreshToken: RefreshTokenModel, bank?: string): Session {
        const {
            platformType,
            platformVersion,
            appVersion,
            authEntryPointHistory = [],
            createdAt,
            lastActivityDate,
            mobileUid,
        } = refreshToken

        const filteredAuthEntryPointHistory: AuthEntryPointHistory[] = authEntryPointHistory.filter(
            (item: AuthEntryPointHistory) => item.authEntryPoint.target !== AuthMethod.PhotoId,
        )
        const lastAuthEntryPoint = filteredAuthEntryPointHistory[filteredAuthEntryPointHistory.length - 1].authEntryPoint
        const authType = this.authProviderToAuthType.get(lastAuthEntryPoint.target)
        if (!authType) {
            throw new InternalServerError(`Caught session with unexpected authentication method [${lastAuthEntryPoint.target}]`)
        }

        const result: Session = {
            id: this.identifier.createIdentifier(mobileUid!),
            status: this.getStatus(refreshToken),
            platform: {
                type: platformType!,
                version: platformVersion!,
            },
            appVersion: appVersion!,
            auth: {
                type: authType,
                bank,
                creationDate: moment(createdAt).format(this.dateFormat),
                lastActivityDate: moment(lastActivityDate || createdAt).format(this.dateFormat),
            },
        }
        if (authType === AuthType.Nfc) {
            result.auth.document = this.nfcDocumentToName[lastAuthEntryPoint.document!] || lastAuthEntryPoint.document
        }

        return result
    }

    getStatus({ isDeleted, expired }: RefreshTokenModel): boolean {
        return !(isDeleted || expired)
    }

    toEntityWithActions(
        refreshToken: RefreshTokenModel,
        sharingBadge: number | undefined,
        signingBadge: number | undefined,
        bank?: string,
    ): SessionWithActions {
        return {
            ...this.toEntity(refreshToken, bank),
            action: {
                sharing: {
                    name: this.i18nService.get('sessionWithActions.action.sharing.name'),
                    badge: sharingBadge,
                },
                signing: {
                    name: this.i18nService.get('sessionWithActions.action.signing.name'),
                    badge: signingBadge,
                },
            },
        }
    }
}
