import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AttestationService from '@services/integrity/attestation'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/validateAttestation'

export default class ValidateAttestationAction implements AppAction {
    constructor(private readonly integrityAttestationService: AttestationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'validateAttestation'

    readonly validationRules: ValidationSchema = { nonce: { type: 'string' }, signedAttestationStatement: { type: 'string' } }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { nonce, signedAttestationStatement },
            session: {
                user: { identifier: userIdentifier },
            },
            headers: { mobileUid },
        } = args

        await this.integrityAttestationService.launchIntegrityChallenge(userIdentifier, mobileUid, signedAttestationStatement, nonce)

        return { success: true }
    }
}
