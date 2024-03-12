import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion } from '@diia-inhouse/types'

import { SignedData } from '@interfaces/services/diiaSignature'

export default class DiiaSignatureService {
    constructor(private readonly moleculer: MoleculerService) {}

    private readonly serviceName: string = 'DiiaSignature'

    async getSignature(requestId: string): Promise<string> {
        const {
            signedItems: [{ signature }],
        }: SignedData = await this.moleculer.act(
            this.serviceName,
            { name: 'getSignedData', actionVersion: ActionVersion.V1 },
            { params: { requestId } },
        )

        return signature
    }
}
