import { ObjectId } from 'bson'

import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'
import {
    CreateOfferRequestResult,
    GetAcquirerIdByHashIdResult,
    GetServiceEntranceDataByOtpResult,
    OfferRequestType,
} from '@interfaces/services/documentAcquirers'

export default class DocumentAcquirersService {
    constructor(
        private readonly moleculer: MoleculerService,
        private readonly config: AppConfig,
    ) {}

    private readonly serviceName: string = 'DocumentAcquirers'

    async getAcquirerIdByToken(acquirerToken: string): Promise<ObjectId> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getAcquirerIdByToken', actionVersion: ActionVersion.V1 },
            { params: { acquirerToken } },
        )
    }

    async getAcquirerIdByHashId(acquirerHashId: string, partnerId: ObjectId): Promise<GetAcquirerIdByHashIdResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getAcquirerIdByHashId', actionVersion: ActionVersion.V1 },
            { params: { acquirerHashId, partnerId } },
        )
    }

    async getServiceEntranceDataByOtp(otp: string): Promise<GetServiceEntranceDataByOtpResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getServiceEntranceDataByOtp', actionVersion: ActionVersion.V1 },
            { params: { otp } },
        )
    }

    async createOfferRequest(requestId: string): Promise<CreateOfferRequestResult> {
        const { acquirerToken, branchId, offerId } = this.config.auth.diiaSignature
        const acquirerId = await this.getAcquirerIdByToken(acquirerToken)

        return await this.moleculer.act(
            this.serviceName,
            { name: 'createOfferRequest', actionVersion: ActionVersion.V2 },
            {
                params: { branchId, offerId, offerRequestType: OfferRequestType.Dynamic, requestId },
                session: {
                    sessionType: SessionType.Acquirer,
                    acquirer: { _id: acquirerId, sessionType: SessionType.Acquirer, refreshToken: null },
                },
            },
        )
    }
}
