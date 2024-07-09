import { BadRequestError } from '@diia-inhouse/errors'

import BankIdAuthMethodService from '@services/authMethods/bankId'
import DsAuthMethodService from '@services/authMethods/ds'
import EmailOtpAuthMethodService from '@services/authMethods/emailOtp'
import EResidentMrzAuthMethodService from '@services/authMethods/eResidentMrz'
import EResidentNfcAuthMethodService from '@services/authMethods/eResidentNfc'
import EResidentQrCodeAuthMethodService from '@services/authMethods/eResidentQrCode'
import MonobankAuthMethodService from '@services/authMethods/monobank'
import NfcAuthMethodService from '@services/authMethods/nfc'
import PhotoIdAuthMethodService from '@services/authMethods/photoId'
import PrivatBankAuthMethodService from '@services/authMethods/privatBank'
import QesAuthMethodService from '@services/authMethods/qes'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthMethodVerifyResult, AuthProviderFactory } from '@interfaces/services/authMethods'

export default class AuthService {
    constructor(
        private readonly authMethodsBankIdService: BankIdAuthMethodService,
        private readonly authMethodsDsService: DsAuthMethodService,
        private readonly authMethodsEmailOtpService: EmailOtpAuthMethodService,
        private readonly authMethodsEResidentMrzService: EResidentMrzAuthMethodService,
        private readonly authMethodsEResidentNfcService: EResidentNfcAuthMethodService,
        private readonly authMethodsEResidentQrCodeService: EResidentQrCodeAuthMethodService,
        private readonly authMethodsMonobankService: MonobankAuthMethodService,
        private readonly authMethodsNfcService: NfcAuthMethodService,
        private readonly authMethodsPhotoIdService: PhotoIdAuthMethodService,
        private readonly authMethodsPrivatBankService: PrivatBankAuthMethodService,
        private readonly authMethodsQesService: QesAuthMethodService,
    ) {
        this.providers = {
            [AuthMethod.BankId]: this.authMethodsBankIdService,
            [AuthMethod.Ds]: this.authMethodsDsService,
            [AuthMethod.EmailOtp]: this.authMethodsEmailOtpService,
            [AuthMethod.EResidentMrz]: this.authMethodsEResidentMrzService,
            [AuthMethod.EResidentNfc]: this.authMethodsEResidentNfcService,
            [AuthMethod.EResidentQrCode]: this.authMethodsEResidentQrCodeService,
            [AuthMethod.Monobank]: this.authMethodsMonobankService,
            [AuthMethod.Nfc]: this.authMethodsNfcService,
            [AuthMethod.PhotoId]: this.authMethodsPhotoIdService,
            [AuthMethod.PrivatBank]: this.authMethodsPrivatBankService,
            [AuthMethod.Qes]: this.authMethodsQesService,
        }
    }

    private readonly providers: Record<AuthMethod, AuthProviderFactory>

    async getAuthUrl(method: AuthMethod, ops: AuthUrlOps, headers: AuthProviderHeaders, schemaCode?: AuthSchemaCode): Promise<string> {
        const authProvider = this.providers[method]

        if (!authProvider) {
            throw new BadRequestError(`Passed authMethod [${method}] is not enabled `)
        }

        return await authProvider.requestAuthorizationUrl(ops, headers, schemaCode)
    }

    async verify(method: AuthMethod, requestId: string, ops: AuthMethodVerifyParams): Promise<AuthMethodVerifyResult | void> {
        const authProvider = this.providers[method]

        if (!authProvider) {
            throw new BadRequestError(`Passed authMethod [${method}] is not enabled `)
        }

        return await authProvider.verify(requestId, ops)
    }
}
