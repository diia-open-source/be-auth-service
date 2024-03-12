import { GrpcAppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import OpenIdService from '@services/openId'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getUserOpenIdData'

export default class GetUserOpenIdDataAction implements GrpcAppAction {
    constructor(private readonly openIdService: OpenIdService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getUserOpenIdData'

    readonly validationRules: ValidationSchema = { token: { type: 'string' } }

    handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { token },
        } = args

        return this.openIdService.getUserOpenIdDetails(token)
    }
}
