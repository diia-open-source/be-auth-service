import { v5 as uuidv5 } from 'uuid'

import { IdentifierService } from '@diia-inhouse/crypto'
import { SessionType, User } from '@diia-inhouse/types'

import UserAuthStepsAuthDataService from '@services/userAuthSteps/authData'
import UserAuthTokenService from '@services/userAuthToken'

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

export default class CabinetAuthorizationStrategyService implements AuthSchemaStrategy {
    constructor(
        private readonly identifier: IdentifierService,

        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly isUserRequired: boolean = false

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.Ds]: ProcessCode.AuthQesSuccess,
            [AuthMethod.Qes]: ProcessCode.AuthQesSuccess,
            [AuthMethod.BankId]: ProcessCode.AuthBankSuccessWithoutPhoto,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, authSteps, headers, authMethodParams } = options
        const { processId } = authSteps
        const { bankId, qesPayload } = authMethodParams
        const userData: User = await this.userAuthTokenService.prepareUserData({
            method,
            requestId,
            headers,
            bankId,
            qesPayload,
        })
        const { itn } = userData
        const userIdentifier: string = this.identifier.createIdentifier(itn)
        switch (method) {
            case AuthMethod.BankId:
            case AuthMethod.Ds:
            case AuthMethod.Qes: {
                const tokenParams: GetTokenParams = {
                    headers: { ...headers, mobileUid: uuidv5(itn, headers.mobileUid) },
                    method,
                    requestId,
                    sessionType: SessionType.CabinetUser,
                    bankId,
                    user: userData,
                }
                const authDataParams: AuthorizationDataParams = {
                    attachUserIdentifier: true,
                    code: AuthSchemaCode.CabinetAuthorization,
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
