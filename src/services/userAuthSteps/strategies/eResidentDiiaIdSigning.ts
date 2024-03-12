import { EnvService } from '@diia-inhouse/env'

import AuthService from '@services/auth'

import { AuthMethod, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthSchemaStrategy, AuthStepsStatusToAuthMethodProcessCode, AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

export default class EResidentDiiaIdSigningStrategyService implements AuthSchemaStrategy {
    constructor(
        private readonly authService: AuthService,
        private readonly envService: EnvService,
    ) {}

    readonly isUserRequired: boolean = true

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.PhotoId]: ProcessCode.DiiaIdSigningPhotoIdSuccess,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, headers } = options

        switch (method) {
            case AuthMethod.PhotoId: {
                // TODO(BACK-0): eresident. enable real check. For now its turned off everywhere, except prod
                if (this.envService.isProd()) {
                    await this.authService.verify(method, requestId, { headers })
                }

                return []
            }
            default: {
                const unhandledMethod = method

                throw new TypeError(`Unhandled method: ${unhandledMethod}`)
            }
        }
    }
}
