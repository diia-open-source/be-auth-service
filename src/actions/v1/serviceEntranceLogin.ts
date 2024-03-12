import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/serviceEntranceLogin'

export default class ServiceEntranceLoginAction implements AppAction {
    constructor(private readonly userAuthTokenService: UserAuthTokenService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'serviceEntranceLogin'

    readonly validationRules: ValidationSchema = { otp: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { otp },
            headers: { mobileUid, traceId },
        } = args

        const token: string = await this.userAuthTokenService.getServiceEntranceToken(otp, mobileUid, traceId)

        return { token }
    }
}
