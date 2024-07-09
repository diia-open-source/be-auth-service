import { EnvService } from '@diia-inhouse/env'
import { AccessDeniedError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import UserAuthTokenService from '@services/userAuthToken'

import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthSchemaStrategy, AuthStepsStatusToAuthMethodProcessCode, AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

export default class DiiaIdCreationStrategyService implements AuthSchemaStrategy {
    readonly isUserRequired: boolean = true

    private readonly comparingItnIsEnabled: boolean

    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly envService: EnvService,

        private readonly userAuthTokenService: UserAuthTokenService,
    ) {
        this.comparingItnIsEnabled = this.config.authService.schema.comparingItnIsEnabled
    }

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.BankId]: ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
            [AuthMethod.Monobank]: ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
            [AuthMethod.PrivatBank]: ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
            [AuthMethod.PhotoId]: ProcessCode.UserPhotoIdAuthSuccess,
            [AuthMethod.Nfc]: ProcessCode.UserBankindNfcAuthSuccess,
        },
        [UserAuthStepsStatus.Processing]: {
            [AuthMethod.Nfc]: ProcessCode.UserBankindNfcAuthSuccess,
            [AuthMethod.PhotoId]: ProcessCode.UserPhotoIdAuthSuccess,
            [AuthMethod.BankId]: ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
            [AuthMethod.Monobank]: ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
            [AuthMethod.PrivatBank]: ProcessCode.DiiaIdCreationUserBankingAuthSuccess,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, authSteps, headers, authMethodParams, user } = options
        const { bankId } = authMethodParams
        const { processId } = authSteps
        const userData = await this.userAuthTokenService.prepareUserData({ method, requestId, headers, bankId })
        switch (method) {
            case AuthMethod.Nfc:
            case AuthMethod.BankId:
            case AuthMethod.Monobank:
            case AuthMethod.PrivatBank: {
                if ((this.comparingItnIsEnabled || this.envService.isProd()) && userData.itn !== user?.itn) {
                    this.logger.error('Itn has not matched', { processId })

                    throw new AccessDeniedError()
                }

                return []
            }
            case AuthMethod.PhotoId: {
                return []
            }
            default: {
                const unhandledMethod = method

                throw new TypeError(`Unhandled auth method: ${unhandledMethod}`)
            }
        }
    }
}
