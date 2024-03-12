import { SetRequired } from 'type-fest'

import { ActHeaders } from '@diia-inhouse/types'

export type AttestationHeadersParams = SetRequired<ActHeaders, 'mobileUid'>

export interface IntegrityChallengeService {
    createIntegrityChallenge(userIdentifier: string, headers: AttestationHeadersParams): Promise<string>

    launchIntegrityChallenge(userIdentifier: string, mobileUid: string, signedAttestationStatement: string, nonce?: string): Promise<void>
}
