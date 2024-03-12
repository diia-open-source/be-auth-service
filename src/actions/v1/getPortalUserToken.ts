import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthTokenService from '@services/authToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getPortalUserToken'

export default class GetPortalUserTokenAction implements AppAction {
    constructor(private readonly authTokenService: AuthTokenService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getPortalUserToken'

    readonly validationRules: ValidationSchema = {
        itn: { type: 'string' },
        fName: { type: 'string' },
        lName: { type: 'string' },
        mName: { type: 'string' },
        birthDay: { type: 'string' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: user,
            headers: { traceId },
        } = args

        const token: string = await this.authTokenService.getPortalUserToken(user, traceId)

        return { token }
    }
}
