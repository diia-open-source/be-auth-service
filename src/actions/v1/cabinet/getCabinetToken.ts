import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthStepsService from '@services/userAuthSteps'
import UserAuthStepsAuthDataService from '@services/userAuthSteps/authData'
import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getCabinetToken'
import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { GenerateTokenResult, GetUserTokenParams } from '@interfaces/services/userAuthToken'

export default class GetCabinetToken implements AppAction {
    constructor(
        private readonly userAuthTokenService: UserAuthTokenService,
        private readonly userAuthStepsService: UserAuthStepsService,
        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getCabinetToken'

    readonly validationRules: ValidationSchema = { processId: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { processId },
            headers: { mobileUid: deviceUid },
        } = args
        const code = AuthSchemaCode.CabinetAuthorization

        await this.userAuthStepsService.completeSteps({
            code,
            processId,
            mobileUid: deviceUid,
        })
        const params: GetUserTokenParams = await this.userAuthStepsAuthDataService.getAuthorizationCacheData(code, processId)
        const { token }: GenerateTokenResult = await this.userAuthTokenService.getUserToken(params)

        return { token, mobileUid: params.headers.mobileUid }
    }
}
