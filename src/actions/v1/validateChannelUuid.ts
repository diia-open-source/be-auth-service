import { AppAction } from '@diia-inhouse/diia-app'

import { UnauthorizedError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import Utils from '@src/utils'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/validateChannelUuid'

export default class ValidateChannelUuidAction implements AppAction {
    constructor(private readonly appUtils: Utils) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'validateChannelUuid'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            headers: { channelUuid },
            session: {
                user: { identifier },
            },
        } = args

        const generatedChannelUuid: string = await this.appUtils.generateChannelUuid(identifier)

        if (channelUuid !== generatedChannelUuid) {
            throw new UnauthorizedError()
        }

        return { success: true }
    }
}
