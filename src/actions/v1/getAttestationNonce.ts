import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import AttestationService from '@services/integrity/attestation'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getAttestationNonce'

export default class GetAttestationNonceAction implements AppAction {
    constructor(private readonly integrityAttestationService: AttestationService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'getAttestationNonce'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: {
                user: { identifier: userIdentifier },
            },
            headers,
        } = args

        const nonce = await this.integrityAttestationService.createIntegrityChallenge(userIdentifier, headers)

        return { nonce }
    }
}
