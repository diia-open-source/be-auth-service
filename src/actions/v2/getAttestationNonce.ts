import { AppAction } from '@diia-inhouse/diia-app'

import { BadRequestError } from '@diia-inhouse/errors'
import { ActionVersion, PlatformType, SessionType } from '@diia-inhouse/types'

import GoogleIntegrityCheckService from '@services/integrity/googleCheck'
import HuaweiIntegrityCheckService from '@services/integrity/huaweiCheck'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getAttestationNonce'

export default class GetAttestationNonceAction implements AppAction {
    constructor(
        private readonly integrityGoogleCheckService: GoogleIntegrityCheckService,
        private readonly integrityHuaweiCheckService: HuaweiIntegrityCheckService,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name = 'getAttestationNonce'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                user: { identifier: userIdentifier },
            },
            headers,
        } = args

        const { platformType } = headers
        let nonce: string
        switch (platformType) {
            case PlatformType.Android:
                nonce = await this.integrityGoogleCheckService.createIntegrityChallenge(userIdentifier, headers)
                break
            case PlatformType.Huawei:
                nonce = await this.integrityHuaweiCheckService.createIntegrityChallenge(userIdentifier, headers)
                break
            default:
                throw new BadRequestError(`This operation is not supported for platform ${platformType}`)
        }

        return { nonce }
    }
}
