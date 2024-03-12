import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion } from '@diia-inhouse/types'

import { GetPartnerResult } from '@interfaces/services/partner'

export default class PartnerService {
    constructor(private readonly moleculer: MoleculerService) {}

    private readonly serviceName: string = 'Partner'

    async getPartnerByToken(partnerToken: string): Promise<GetPartnerResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getPartnerByToken', actionVersion: ActionVersion.V1 },
            { params: { partnerToken } },
        )
    }
}
