import UserAuthTokenService from '@services/userAuthToken'

import { AuthMethod, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthSchemaStrategy, AuthStepsStatusToAuthMethodProcessCode, AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

export default class DiiaIdSharingDeeplinkStaticStrategyService implements AuthSchemaStrategy {
    constructor(private readonly userAuthTokenService: UserAuthTokenService) {}

    readonly isUserRequired: boolean = true

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.PhotoId]: ProcessCode.UserPhotoIdAuthSuccess,
        },
        [UserAuthStepsStatus.Processing]: {
            [AuthMethod.PhotoId]: ProcessCode.UserPhotoIdAuthSuccess,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, headers, authMethodParams } = options
        const { bankId } = authMethodParams

        await this.userAuthTokenService.prepareUserData({ method, requestId, headers, bankId })
        switch (method) {
            case AuthMethod.Nfc:
            case AuthMethod.BankId:
            case AuthMethod.Monobank:
            case AuthMethod.PrivatBank: {
                throw new Error(`Unexpected auth method: ${method}`)
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
