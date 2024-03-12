import { IdentifierService } from '@diia-inhouse/crypto'
import { SessionType } from '@diia-inhouse/types'

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

export default class AuthorizationStrategyService implements AuthSchemaStrategy {
    constructor(
        private readonly identifier: IdentifierService,

        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly isUserRequired: boolean = false

    readonly authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode = {
        [UserAuthStepsStatus.Success]: {
            [AuthMethod.PhotoId]: ProcessCode.AuthBankPhotoIdSuccess,
            [AuthMethod.Nfc]: ProcessCode.AuthNfcSuccess,
            [AuthMethod.BankId]: ProcessCode.AuthBankSuccessWithoutPhoto,
            [AuthMethod.Monobank]: ProcessCode.AuthBankSuccessWithoutPhoto,
            [AuthMethod.PrivatBank]: ProcessCode.AuthBankSuccessWithoutPhoto,
        },
        [UserAuthStepsStatus.Processing]: {
            [AuthMethod.BankId]: ProcessCode.AuthBankSuccessWithPhoto,
            [AuthMethod.Monobank]: ProcessCode.AuthBankSuccessWithPhoto,
            [AuthMethod.PrivatBank]: ProcessCode.AuthBankSuccessWithPhoto,
        },
    }

    // private readonly testItn = this.config.applicationStoreReview.testItn

    async verify(options: AuthStrategyVerifyOptions): Promise<AuthSchemaCondition[]> {
        const { method, requestId, authSteps, headers, authMethodParams } = options
        const { bankId } = authMethodParams
        const { processId } = authSteps
        const userData = await this.userAuthTokenService.prepareUserData({ method, requestId, headers, bankId })
        const { itn } = userData
        const userIdentifier: string = this.identifier.createIdentifier(itn)
        switch (method) {
            case AuthMethod.BankId:
            case AuthMethod.Monobank:
            case AuthMethod.PrivatBank:
            case AuthMethod.Nfc: {
                const tokenParams: GetTokenParams = {
                    headers,
                    method,
                    requestId,
                    sessionType: SessionType.User,
                    bankId,
                    user: userData,
                }
                const authDataParams: AuthorizationDataParams = {
                    attachUserIdentifier: true,
                    code: AuthSchemaCode.Authorization,
                    processId,
                    userIdentifier,
                    tokenParams,
                }

                await this.userAuthStepsAuthDataService.saveAuthorizationData(authDataParams)
                // if (method === AuthMethod.Nfc) {
                //     return [];
                // }

                // const { itn } = tokenData;
                // if (itn === this.testItn) {
                //     return [];
                // }

                // try {
                //     const { exists } = await this.documentsService.checkPassport(tokenData, true);
                //     if (exists) {
                //         return [AuthSchemaCondition.HasDocumentPhoto];
                //     }
                // } catch (err) {
                //     this.logger.fatal('Failed to check passport', { err });
                // }

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
