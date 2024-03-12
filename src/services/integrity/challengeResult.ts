import { AnalyticsActionResult, AnalyticsActionType, AnalyticsService } from '@diia-inhouse/analytics'
import { ActHeaders } from '@diia-inhouse/types'

import { IntegrityChallenge } from '@interfaces/models/integrity/integrityChallenge'

export default class IntegrityChallengeResultService {
    constructor(private readonly analytics: AnalyticsService) {}

    async completeAttestation(challengeSuccessful: boolean, attestation: IntegrityChallenge): Promise<void> {
        const { userIdentifier, headers } = attestation
        if (challengeSuccessful) {
            this.analytics.authLog(AnalyticsActionType.Attestation, AnalyticsActionResult.Confirming, userIdentifier, headers)
        } else {
            await this.userFailedAttestation(userIdentifier, headers)
        }
    }

    async userFailedAttestation(userIdentifier: string, headers: ActHeaders): Promise<void> {
        this.analytics.authLog(AnalyticsActionType.Attestation, AnalyticsActionResult.NotConfirmed, userIdentifier, headers)

        // await Promise.all([
        //     this.cache.set(this.prepareAttestationCackeKey(mobileUid), false, this.refreshTokenLifetime / 1000),
        //     this.refreshTokenService.markAsCompromised(mobileUid)
        // ]);
    }
}
