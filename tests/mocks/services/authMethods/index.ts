import { ServiceOperator } from '@diia-inhouse/diia-app'

import { BadRequestError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import InvalidateTemporaryTokenAction from '@actions/v1/invalidateTemporaryToken'

import FaceRecoAuthPhotoVerificationMockEventListener from '@mocks/externalEventListeners/faceRecoAuthPhotoVerification'

import { AuthMockProvider } from '@tests/interfaces/mocks/services/authMethods'
import BankIdAuthMethodMockService from '@tests/mocks/services/authMethods/bankId'
import EmailOtpAuthMethodMockService from '@tests/mocks/services/authMethods/emailOtp'
import EResidentMrzAuthMethodMockService from '@tests/mocks/services/authMethods/eResidentMrz'
import EResidentNfcAuthMethodMockService from '@tests/mocks/services/authMethods/eResidentNfc'
import MonobankAuthMethodMockService from '@tests/mocks/services/authMethods/monobank'
import NfcAuthMethodMockService from '@tests/mocks/services/authMethods/nfc'
import PhotoIdAuthMethodMockService from '@tests/mocks/services/authMethods/photoId'
import PrivatBankAuthMethodMockService from '@tests/mocks/services/authMethods/privatBank'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'
import { AuthMethod } from '@interfaces/models/authSchema'

export default class AuthMethodMockFactory {
    constructor(private readonly app: ServiceOperator<AppConfig, AppDeps>) {
        this.logger = app.container.resolve('logger')
    }

    private readonly logger: Logger

    private readonly providers: Partial<Record<AuthMethod, AuthMockProvider | null>> = {
        [AuthMethod.BankId]: this.app.container.build(BankIdAuthMethodMockService),
        [AuthMethod.EmailOtp]: this.app.container.build(EmailOtpAuthMethodMockService),
        [AuthMethod.EResidentMrz]: this.app.container.build(EResidentMrzAuthMethodMockService),
        [AuthMethod.EResidentNfc]: this.app.container.build(EResidentNfcAuthMethodMockService),
        [AuthMethod.Monobank]: this.app.container.build(MonobankAuthMethodMockService),
        [AuthMethod.Nfc]: this.app.container.build(NfcAuthMethodMockService, {
            injector: (c) => ({ invalidateTemporaryTokenAction: c.build(InvalidateTemporaryTokenAction) }),
        }),
        [AuthMethod.PhotoId]: this.app.container.build(PhotoIdAuthMethodMockService, {
            injector: (c) => ({ faceRecoAuthPhotoVerificationMockEventListener: c.build(FaceRecoAuthPhotoVerificationMockEventListener) }),
        }),
        [AuthMethod.PrivatBank]: this.app.container.build(PrivatBankAuthMethodMockService),
        [AuthMethod.EResidentQrCode]: null,
        [AuthMethod.Qes]: null,
    }

    getAuthProvider(method: AuthMethod): AuthMockProvider {
        const authMethod = this.providers[method]

        if (!authMethod) {
            this.logger.fatal(`Provider ${method} is not implemented`)

            throw new BadRequestError('Invalid provider')
        }

        return authMethod
    }
}
