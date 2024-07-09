import { AppAction } from '@diia-inhouse/diia-app'

import { mongo } from '@diia-inhouse/db'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthTokenService from '@services/authToken'

import { ActionResult, Context } from '@interfaces/actions/v1/partnerAcquirerLogin'

export default class PartnerAcquirerLoginAction implements AppAction<Context> {
    constructor(private readonly authTokenService: AuthTokenService) {}

    readonly sessionType: SessionType = SessionType.Partner

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'partnerAcquirerLogin'

    readonly validationRules: ValidationSchema = { acquirerId: { type: 'string' } }

    async handler(ctx: Context): Promise<ActionResult> {
        const {
            session: {
                partner: { _id: partnerId },
            },
            params: { acquirerId },
            headers: { traceId },
        } = ctx

        const token = await this.authTokenService.getPartnerAcquirerAuthToken(acquirerId, new mongo.ObjectId(partnerId), traceId)

        return { token }
    }
}
