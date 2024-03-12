import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import Utils from '@src/utils'

import UserAuthStepsService from '@services/userAuthSteps'
import UserAuthStepsAuthDataService from '@services/userAuthSteps/authData'
import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v3/getToken'
import { AuthSchemaCode } from '@interfaces/models/authSchema'

export default class GetTokenAction implements AppAction {
    constructor(
        private readonly appUtils: Utils,

        private readonly userAuthStepsService: UserAuthStepsService,
        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V3

    readonly name = 'getToken'

    readonly validationRules: ValidationSchema = { processId: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { processId },
            headers: { mobileUid },
        } = args

        const code = AuthSchemaCode.Authorization

        await this.userAuthStepsService.completeSteps({ code, processId, mobileUid })

        const params = await this.userAuthStepsAuthDataService.getAuthorizationCacheData(code, processId)
        const { token, identifier } = await this.userAuthTokenService.getUserToken(params)

        const channelUuid = await this.appUtils.generateChannelUuid(identifier)

        return { token, channelUuid }
    }
}
