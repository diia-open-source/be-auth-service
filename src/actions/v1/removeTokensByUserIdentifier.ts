import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import RefreshTokenService from '@services/refreshToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/removeTokensByUserIdentifier'

export default class RemoveTokensByUserIdentifierAction implements GrpcAppAction {
    constructor(private readonly refreshTokenService: RefreshTokenService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'removeTokensByUserIdentifier'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        userIdentifier: { type: 'string' },
        sessionType: { type: 'string', enum: Object.values(SessionType) },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { userIdentifier, sessionType },
        } = args

        await this.refreshTokenService.removeTokensByUserIdentifier(userIdentifier, <SessionType>sessionType)
    }
}
