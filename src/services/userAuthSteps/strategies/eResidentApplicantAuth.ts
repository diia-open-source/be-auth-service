import { IdentifierService } from '@diia-inhouse/crypto'
import { AccessDeniedError } from '@diia-inhouse/errors'
import { EResidentApplicant, IdentifierPrefix, SessionType } from '@diia-inhouse/types'

import AuthService from '@services/auth'
import UserAuthStepsAuthDataService from '@services/userAuthSteps/authData'

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

export default class EResidentApplicantAuthStrategyService implements AuthSchemaStrategy {
    constructor(
        private readonly identifier: IdentifierService,

        private readonly authService: AuthService,
        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
    ) {}

    isUserRequired = false

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.EmailOtp]: ProcessCode.EResidentApplicantOtpSuccess,
        },
        [UserAuthStepsStatus.Processing]: {
            [AuthMethod.EmailOtp]: ProcessCode.EResidentApplicantOtpSuccess,
        },
        [UserAuthStepsStatus.Failure]: {
            [AuthMethod.EmailOtp]: ProcessCode.EResidentApplicantAuthOtpFail,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, authSteps, headers, authMethodParams } = options

        switch (method) {
            case AuthMethod.EmailOtp: {
                const { processId } = authSteps
                const { otp } = authMethodParams
                let user: EResidentApplicant
                try {
                    user = <EResidentApplicant>await this.authService.verify(method, requestId, {
                        headers,
                        otp,
                    })
                } catch (err) {
                    throw new AccessDeniedError(
                        'Verification failed. Reason: Otp is invalid or expired',
                        {},
                        ProcessCode.EResidentApplicantAuthOtpFail,
                    )
                }

                const { email } = user
                const userIdentifier = this.identifier.createIdentifier(email, { prefix: IdentifierPrefix.EResidentApplicant })

                const tokenParams: GetTokenParams<EResidentApplicant> = {
                    headers,
                    method,
                    requestId,
                    sessionType: SessionType.EResidentApplicant,
                    user,
                }
                const authDataParams: AuthorizationDataParams<GetTokenParams<EResidentApplicant>> = {
                    attachUserIdentifier: true,
                    code: AuthSchemaCode.EResidentApplicantAuth,
                    processId,
                    userIdentifier,
                    tokenParams,
                }

                await this.userAuthStepsAuthDataService.saveAuthorizationData(authDataParams)

                return []
            }
            default: {
                const unhandledMethod = method

                throw new TypeError(`Unhandled auth method: ${unhandledMethod}`)
            }
        }
    }
}
