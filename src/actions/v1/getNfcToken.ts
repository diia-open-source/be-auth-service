import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getNfcToken'

export default class GetNfcTokenAction implements AppAction {
    constructor(private readonly userAuthTokenService: UserAuthTokenService) {}

    readonly sessionType: SessionType = SessionType.Temporary

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getNfcToken'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const { headers } = args

        const { token } = await this.userAuthTokenService.getNfcUserToken(headers)

        return { token }
    }
}
