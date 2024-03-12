import { AppAction } from '@diia-inhouse/diia-app'

import { BadRequestError } from '@diia-inhouse/errors'
import { ActionVersion, PlatformType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import GoogleIntegrityCheckService from '@services/integrity/googleCheck'
import HuaweiIntegrityCheckService from '@services/integrity/huaweiCheck'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/validateAttestation'

export default class ValidateAttestationAction implements AppAction {
    constructor(
        private readonly integrityGoogleCheckService: GoogleIntegrityCheckService,
        private readonly integrityHuaweiCheckService: HuaweiIntegrityCheckService,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name = 'validateAttestation'

    readonly validationRules: ValidationSchema = { signedAttestationStatement: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { signedAttestationStatement },
            session: {
                user: { identifier: userIdentifier },
            },
            headers: { mobileUid, platformType },
        } = args

        switch (platformType) {
            case PlatformType.Android:
                await this.integrityGoogleCheckService.launchIntegrityChallenge(userIdentifier, mobileUid, signedAttestationStatement)
                break
            case PlatformType.Huawei:
                await this.integrityHuaweiCheckService.launchIntegrityChallenge(userIdentifier, mobileUid, signedAttestationStatement)
                break
            default:
                throw new BadRequestError(`This operation is not supported for platform ${platformType}`)
        }

        return { success: true }
    }
}
