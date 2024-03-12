import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import SessionService from '@services/session'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getUserSessionsDeleteConfirmation'
import { ProcessCode } from '@interfaces/services'

export default class GetUserSessionsDeleteConfirmationAction implements AppAction {
    constructor(private readonly sessionService: SessionService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getUserSessionsDeleteConfirmation'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                user: { identifier: userIdentifier },
            },
        } = args

        const processCode: ProcessCode = await this.sessionService.getDeleteConfirmation(userIdentifier)

        return { processCode }
    }
}
