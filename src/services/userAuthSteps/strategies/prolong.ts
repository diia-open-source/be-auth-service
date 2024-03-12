import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import { DocumentType, Logger, SessionType, User } from '@diia-inhouse/types'

import UserService from '@services/user'
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

export default class ProlongStrategyService implements AuthSchemaStrategy {
    constructor(
        private readonly logger: Logger,

        private readonly userService: UserService,
        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly isUserRequired: boolean = true

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.BankId]: ProcessCode.SchemaProlongSuccess,
            [AuthMethod.Monobank]: ProcessCode.SchemaProlongSuccess,
            [AuthMethod.PrivatBank]: ProcessCode.SchemaProlongSuccess,
            [AuthMethod.PhotoId]: ProcessCode.SchemaProlongSuccess,
            [AuthMethod.Nfc]: ProcessCode.SchemaProlongSuccess,
        },
        [UserAuthStepsStatus.Processing]: {
            [AuthMethod.BankId]: ProcessCode.SchemaProlongStepSuccess,
            [AuthMethod.Monobank]: ProcessCode.SchemaProlongStepSuccess,
            [AuthMethod.PrivatBank]: ProcessCode.SchemaProlongStepSuccess,
        },
    }

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, authSteps, headers, authMethodParams, user } = options
        const { processId } = authSteps
        const { bankId } = authMethodParams

        if (!user) {
            throw new BadRequestError('User is not provided')
        }

        const { identifier, itn } = user

        const userData: User = await this.userAuthTokenService.prepareUserData({ method, requestId, headers, bankId })
        switch (method) {
            case AuthMethod.BankId:
            case AuthMethod.Monobank:
            case AuthMethod.PrivatBank:
            case AuthMethod.Nfc: {
                const { itn: newItn } = userData

                const tokenParams: GetTokenParams = {
                    headers,
                    method,
                    requestId,
                    sessionType: SessionType.User,
                    bankId,
                    user: userData,
                }
                const authDataParams: AuthorizationDataParams = {
                    attachUserIdentifier: false,
                    code: AuthSchemaCode.Prolong,
                    processId,
                    userIdentifier: identifier,
                    tokenParams,
                }

                await this.userAuthStepsAuthDataService.saveAuthorizationData(authDataParams)

                if (itn !== newItn) {
                    this.logger.error('Itn does not match')

                    throw new AccessDeniedError()
                }

                if (method === AuthMethod.Nfc) {
                    return []
                }

                const hasPassport: boolean = await this.userService.hasOneOfDocuments(identifier, [
                    DocumentType.InternalPassport,
                    DocumentType.ForeignPassport,
                ])

                return hasPassport ? [AuthSchemaCondition.HasDocumentPhoto] : []
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
