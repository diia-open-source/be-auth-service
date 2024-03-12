import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion, Logger, PortalUserTokenData, SessionType } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'

export default class VoteService {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly moleculer: MoleculerService,
    ) {}

    private readonly serviceName: string = 'Vote'

    async joinUserToPetitions(user: PortalUserTokenData): Promise<void> {
        if (!this.config.joinUserToPetitions.isEnabled) {
            return
        }

        try {
            const { success } = await this.joinPetitions(user)
            if (!success) {
                this.logger.error('Failed to join user to petitions')
            }
        } catch (err) {
            this.logger.error('Failed to join user to petitions', { err })
        }
    }

    private async joinPetitions(user: PortalUserTokenData): Promise<{ success: boolean }> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'joinPetitions', actionVersion: ActionVersion.V1 },
            { session: { sessionType: SessionType.PortalUser, user } },
        )
    }
}
