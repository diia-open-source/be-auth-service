import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import Utils from '@src/utils'

import UserAuthStepsService from '@services/userAuthSteps'
import UserAuthStepsAuthDataService from '@services/userAuthSteps/authData'
import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v3/eresident/getEResidentToken'
import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { GenerateTokenResult } from '@interfaces/services/userAuthToken'

export default class GetEResidentTokenAction implements AppAction {
    constructor(
        private readonly appUtils: Utils,
        private readonly userAuthStepsService: UserAuthStepsService,
        private readonly userAuthTokenService: UserAuthTokenService,
        private readonly userAuthStepsAuthDataService: UserAuthStepsAuthDataService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V3

    readonly name = 'getEResidentToken'

    readonly validationRules: ValidationSchema = { processId: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { processId },
            headers: { mobileUid },
        } = args

        const { code } = await this.userAuthStepsService.completeSteps({
            oneOfCodes: [AuthSchemaCode.EResidentFirstAuth, AuthSchemaCode.EResidentAuth, AuthSchemaCode.EResidentApplicantAuth],
            processId,
            mobileUid,
        })

        const params = await this.userAuthStepsAuthDataService.getAuthorizationCacheData(code, processId)
        const { token, identifier }: GenerateTokenResult = await this.userAuthTokenService.getToken(params)

        const channelUuid: string = await this.appUtils.generateChannelUuid(identifier)

        return { token, channelUuid }
    }
}
