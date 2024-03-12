import { IdentifierService } from '@diia-inhouse/crypto'
import { EnvService } from '@diia-inhouse/env'
import { UnauthorizedError } from '@diia-inhouse/errors'
import { IdentifierPrefix, Logger, SessionType } from '@diia-inhouse/types'

import AuthService from '@services/auth'
import EResidentFirstAuthService from '@services/eResidentFirstAuth'
import UserAuthStepsAuthDataService from '@services/userAuthSteps/authData'
import UserAuthToken from '@services/userAuthToken'

import { AuthMethod, AuthSchemaCode, AuthSchemaCondition } from '@interfaces/models/authSchema'
import { UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import {
    AuthSchemaStrategy,
    AuthStepsStatusToAuthMethodProcessCode,
    AuthStrategyVerifyOptions,
    AuthorizationDataParams,
} from '@interfaces/services/userAuthSteps'
import { GetTokenParams } from '@interfaces/services/userAuthToken'

export default class EResidentFirstAuthStrategyService implements AuthSchemaStrategy {
    constructor(
        private readonly identifier: IdentifierService,
        private readonly logger: Logger,
        private readonly envService: EnvService,

        private readonly authService: AuthService,
        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
        private readonly userAuthTokenService: UserAuthToken,
        private readonly eResidentFirstAuthService: EResidentFirstAuthService,
    ) {}

    isUserRequired = false

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.EResidentQrCode]: ProcessCode.EResidentQrCodeSuccess,
            [AuthMethod.PhotoId]: ProcessCode.EResidentPhotoIdSuccess,
        },
        [UserAuthStepsStatus.Processing]: {
            [AuthMethod.EResidentQrCode]: ProcessCode.EResidentQrCodeSuccess,
            [AuthMethod.PhotoId]: ProcessCode.EResidentPhotoIdSuccess,
        },
        [UserAuthStepsStatus.Failure]: {
            [AuthMethod.EResidentQrCode]: ProcessCode.EResidentQrCodeFail,
            [AuthMethod.PhotoId]: ProcessCode.EResidentPhotoIdFail,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, authSteps, headers, authMethodParams } = options

        switch (method) {
            case AuthMethod.EResidentQrCode: {
                const { processId } = authSteps
                const { bankId, qrCodePayload } = authMethodParams
                const userData = await this.userAuthTokenService.prepareUserData({
                    method,
                    requestId,
                    headers,
                    bankId,
                    qrCodePayload,
                })
                const userIdentifier = this.identifier.createIdentifier(userData.itn, { prefix: IdentifierPrefix.EResident })

                authSteps.userIdentifier = userIdentifier

                const tokenParams: GetTokenParams = {
                    headers,
                    method,
                    requestId,
                    sessionType: SessionType.EResident,
                    bankId,
                    user: userData,
                }
                const authDataParams: AuthorizationDataParams<GetTokenParams> = {
                    attachUserIdentifier: false,
                    code: AuthSchemaCode.EResidentFirstAuth,
                    processId,
                    userIdentifier,
                    tokenParams,
                }

                await Promise.all([
                    authSteps.save(),
                    this.userAuthStepsAuthDataService.saveAuthorizationData<GetTokenParams>(authDataParams),
                    this.eResidentFirstAuthService.saveQrCodeTokenInCache(
                        AuthSchemaCode.EResidentFirstAuth,
                        headers.mobileUid,
                        qrCodePayload,
                    ),
                ])

                return []
            }
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
