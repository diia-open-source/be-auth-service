import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import SessionService from '@services/session'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getUserSessions'

export default class GetUserSessionsAction implements AppAction {
    constructor(private readonly sessionService: SessionService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getUserSessions'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                user: { identifier: userIdentifier },
            },
        } = args

        const sessions = await this.sessionService.getSessions(userIdentifier)

        return { sessions }
    }
}
