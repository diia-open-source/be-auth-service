import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getTemporaryToken'

export default class GetTemporaryTokenAction implements AppAction {
    constructor(private readonly userAuthTokenService: UserAuthTokenService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getTemporaryToken'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const { headers } = args

        const token: string = await this.userAuthTokenService.getTemporaryToken(headers)

        return { token }
    }
}
