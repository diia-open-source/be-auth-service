import { AppAction } from '@diia-inhouse/diia-app'

import { BadRequestError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthTokenService from '@services/authToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/serviceUser/getServiceUserToken'

export default class GetServiceUserTokenAction implements AppAction {
    constructor(private readonly authTokenService: AuthTokenService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getServiceUserToken'

    readonly validationRules: ValidationSchema = {
        login: { type: 'string' },
        password: { type: 'string', optional: true },
        twoFactorCode: { type: 'string', optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { login, password, twoFactorCode },
            headers: { traceId },
        } = args
        if (!password && !twoFactorCode) {
            throw new BadRequestError('password or twoFactorCode should be provided')
        }

        if (password && twoFactorCode) {
            throw new BadRequestError('Only one of password or twoFactorCode should be provided')
        }

        const token = await this.authTokenService.getServiceUserAuthToken(login, password, twoFactorCode, traceId)

        return { token }
    }
}
