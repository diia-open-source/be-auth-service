import { EnvService } from '@diia-inhouse/env'
import { UnauthorizedError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import AuthService from '@services/auth'

import { AuthMethod, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthSchemaStrategy, AuthStepsStatusToAuthMethodProcessCode, AuthStrategyVerifyOptions } from '@interfaces/services/userAuthSteps'

export default class EResidentDiiaIdCreationStrategyService implements AuthSchemaStrategy {
    constructor(
        private readonly logger: Logger,
        private readonly envService: EnvService,
        private readonly authService: AuthService,
    ) {}

    readonly isUserRequired: boolean = true

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.PhotoId]: ProcessCode.EResidentDiiaIdPhotoIdSuccess,
        },
        [UserAuthStepsStatus.Processing]: {
            [AuthMethod.PhotoId]: ProcessCode.EResidentDiiaIdPhotoIdSuccess,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, headers } = options

        switch (method) {
            case AuthMethod.PhotoId: {
                try {
                    // TODO(BACK-0): eresident. enable real check. For now its turned off everywhere, except prod
                    if (this.envService.isProd()) {
                        await this.authService.verify(method, requestId, { headers })
                    }

                    return []
                } catch (err) {
                    this.logger.error('PhotoId verification error', { err })

                    throw new UnauthorizedError('Photo Identification is not successful', ProcessCode.EResidentPhotoIdFail)
                }
            }
            default: {
                const unhandledMethod = method

                throw new TypeError(`Unhandled auth method: ${unhandledMethod}`)
            }
        }
    }
}
