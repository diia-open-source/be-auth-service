import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { NotFoundError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import RefreshTokenService from '@services/refreshToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getLastRefreshToken'

export default class GetLastRefreshTokenAction implements GrpcAppAction {
    constructor(private readonly refreshTokenService: RefreshTokenService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getLastRefreshToken'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        mobileUid: { type: 'string' },
        sessionType: { type: 'string', enum: Object.values(SessionType) },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { mobileUid, sessionType },
        } = args

        const refreshToken = await this.refreshTokenService.getLastRefreshToken(mobileUid, sessionType)
        if (!refreshToken) {
            throw new NotFoundError('Refresh token not found')
        }

        const {
            _id: id,
            value,
            expirationTime,
            userIdentifier,
            platformType,
            platformVersion,
            appVersion,
            lastActivityDate,
            expirationDate,
        } = refreshToken

        return {
            id: id.toString(),
            value,
            expirationTime,
            userIdentifier,
            platformType,
            platformVersion,
            appVersion,
            lastActivityDate: lastActivityDate?.toISOString(),
            expirationDate: expirationDate?.toISOString(),
        }
    }
}
