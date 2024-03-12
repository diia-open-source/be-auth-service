import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion, EResidentTokenData, SessionType } from '@diia-inhouse/types'

import { GetEResidentPEApplicationDetailsResponse } from '@interfaces/services/public'

export default class PublicService {
    constructor(private readonly moleculer: MoleculerService) {}

    private readonly serviceName: string = 'PublicService'

    async getEResidentPrivateEntrepreneurDetails(user: EResidentTokenData): Promise<GetEResidentPEApplicationDetailsResponse> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getEResidentPEApplicationDetails', actionVersion: ActionVersion.V1 },
            {
                params: {},
                session: { sessionType: SessionType.EResident, user },
            },
        )
    }
}
