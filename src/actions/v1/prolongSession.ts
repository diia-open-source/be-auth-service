import { AppAction } from '@diia-inhouse/diia-app'

import { AuthService } from '@diia-inhouse/crypto'
import { BadRequestError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthStepsService from '@services/userAuthSteps'
import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/prolongSession'
import { AuthSchemaCode } from '@interfaces/models/authSchema'

export default class ProlongSessionAction implements AppAction {
    constructor(
        private readonly userAuthStepsService: UserAuthStepsService,
        private readonly auth: AuthService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'prolongSession'

    readonly validationRules: ValidationSchema = { processId: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { processId },
            headers,
            session: { user },
        } = args
        const { identifier: userIdentifier } = user
        const { mobileUid, token: authToken } = headers

        if (!authToken) {
            throw new BadRequestError('Authorization header is not present')
        }

        const { sessionType, exp } = await this.auth.validate(authToken, user.sessionType, mobileUid)

        await this.userAuthStepsService.completeSteps({ code: AuthSchemaCode.Prolong, processId, mobileUid, userIdentifier })

        const token: string = await this.userAuthTokenService.prolongSession(user, headers, processId, sessionType, exp)

        return { token }
    }
}
