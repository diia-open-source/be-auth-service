import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType, UserTokenData } from '@diia-inhouse/types'

import { CheckPassportResult, DocumentType, EResidency, EResidencyCountryInfo } from '@interfaces/services/documents'
import { GetEResidencyToProcessParams } from '@interfaces/services/userAuthSteps'

export default class DocumentsService {
    constructor(private readonly moleculer: MoleculerService) {}

    private readonly serviceName: string = 'Documents'

    async checkPassport(user: UserTokenData, handlePhoto?: boolean): Promise<CheckPassportResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'checkPassport', actionVersion: ActionVersion.V1 },
            {
                params: { handlePhoto },
                session: { sessionType: SessionType.User, user },
            },
        )
    }

    async getEResidencyToProcess(params: GetEResidencyToProcessParams): Promise<EResidency> {
        return await this.moleculer.act(this.serviceName, { name: 'getEResidencyToProcess', actionVersion: ActionVersion.V1 }, { params })
    }

    async expireDocument(user: UserTokenData, documentType: DocumentType): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'expireDocument', actionVersion: ActionVersion.V1 },
            {
                params: { documentType },
                session: { sessionType: SessionType.User, user },
            },
        )
    }

    async hasDocumentInRegistry(documentType: DocumentType, user: UserTokenData): Promise<boolean> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'hasDocumentInRegistry',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { documentType },
                session: { sessionType: SessionType.User, user },
            },
        )
    }

    async getEResidentCountriesInfo(): Promise<EResidencyCountryInfo[]> {
        const countriesInfo = await this.moleculer.act<EResidencyCountryInfo[]>(this.serviceName, {
            name: 'getEResidentCountriesInfo',
            actionVersion: ActionVersion.V1,
        })

        return countriesInfo || []
    }
}
