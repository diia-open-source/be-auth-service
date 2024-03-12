import { BadRequestError } from '@diia-inhouse/errors'

import UserAuthTokenService from '@services/userAuthToken'

import { AuthMethod, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthSchemaStrategy, AuthStepsStatusToAuthMethodProcessCode, AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

export default class MortgageSigningStrategyService implements AuthSchemaStrategy {
    constructor(private readonly userAuthTokenService: UserAuthTokenService) {}

    readonly isUserRequired: boolean = true

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.PhotoId]: ProcessCode.DiiaIdSigningPhotoIdSuccess,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, headers } = options

        await this.userAuthTokenService.prepareUserData({ method, requestId, headers })
        switch (method) {
            case AuthMethod.PhotoId: {
                return []
            }
            case AuthMethod.BankId:
            case AuthMethod.Monobank:
            case AuthMethod.PrivatBank:
            case AuthMethod.Nfc: {
                throw new BadRequestError(`Unexpected method: ${method}`)
            }
            default: {
                const unhandledMethod = method

                throw new TypeError(`Unhandled method: ${unhandledMethod}`)
            }
        }
    }
}
