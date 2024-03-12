import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthTokenService from '@services/authToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/partnerAcquirerLogin'

export default class PartnerAcquirerLoginAction implements AppAction {
    constructor(private readonly authTokenService: AuthTokenService) {}

    readonly sessionType: SessionType = SessionType.Partner

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'partnerAcquirerLogin'

    readonly validationRules: ValidationSchema = { acquirerId: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                partner: { _id: partnerId },
            },
            params: { acquirerId },
            headers: { traceId },
        } = args

        const token: string = await this.authTokenService.getPartnerAcquirerAuthToken(acquirerId, partnerId, traceId)

        return { token }
    }
}
