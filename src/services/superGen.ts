import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion } from '@diia-inhouse/types'

export default class SuperGenService {
    constructor(private readonly moleculer: MoleculerService) {}

    private readonly serviceName: string = 'SuperGen'

    async generateEResidentOTPEmail(otp: string): Promise<string> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'generateEResidentOTPEmail',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { otp },
            },
        )
    }
}
