import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthSchemaService from '@services/authSchema'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getFldConfig'
import { AuthSchemaCode, AuthSchemaModel } from '@interfaces/models/authSchema'

export default class GetFldConfigAction implements AppAction {
    constructor(private readonly authSchemaService: AuthSchemaService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getFldConfig'

    readonly validationRules: ValidationSchema = {
        isLowRamDevice: { type: 'boolean', optional: true, convert: true },
        builtInTrueDepthCamera: { type: 'boolean', optional: true, convert: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { isLowRamDevice, builtInTrueDepthCamera },
            headers,
        } = args

        const authSchema: AuthSchemaModel = await this.authSchemaService.getByCode(AuthSchemaCode.Authorization)

        return {
            fld: await this.authSchemaService.getFldConfig(authSchema, headers, isLowRamDevice, builtInTrueDepthCamera),
        }
    }
}
