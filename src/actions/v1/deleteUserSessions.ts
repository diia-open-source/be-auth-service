import { AppAction } from '@diia-inhouse/diia-app'

import { ErrorType, UnauthorizedError } from '@diia-inhouse/errors'
import { ActionVersion, PlatformType, SessionType } from '@diia-inhouse/types'

import SessionService from '@services/session'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/deleteUserSessions'

export default class DeleteUserSessionsAction implements AppAction {
    constructor(private readonly sessionService: SessionService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'deleteUserSessions'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                user: { identifier: userIdentifier },
            },
            headers: { platformType },
        } = args

        await this.sessionService.deleteSessions(userIdentifier)

        /**
         * Android treats the 401 error code as a success, as described in the docs https://diia.atlassian.net/wiki/spaces/DIIA/pages/633962753#%D0%92%D0%B8%D0%B4%D0%B0%D0%BB%D0%B8%D1%82%D0%B8-%D0%BF%D0%B5%D1%80%D0%B5%D0%BB%D1%96%D0%BA-%D0%BF%D1%96%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D1%85-%D0%BF%D1%80%D0%B8%D1%81%D1%82%D1%80%D0%BE%D1%97%D0%B2-%D0%B0%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%BE%D0%B3%D0%BE-%D0%BA%D0%BE%D1%80%D0%B8%D1%81%D1%82%D1%83%D0%B2%D0%B0%D1%87%D0%B0.1
         * But iOS immediately makes a refresh token request on the 401 code with an already deleted refresh token, which leads to refresh token action errors
         * and, at the same time, ignores the status code response. So, this hack is presented here.
         */
        if (platformType === PlatformType.Android) {
            throw new UnauthorizedError('Session has been deleted', undefined, ErrorType.Operated)
        } else {
            return { success: true }
        }
    }
}
