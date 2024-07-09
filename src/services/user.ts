import { MoleculerService } from '@diia-inhouse/diia-app'

import { EventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError } from '@diia-inhouse/errors'
import { ActHeaders, ActionVersion, EResidentTokenData, SessionType, UserTokenData } from '@diia-inhouse/types'

import { InternalEvent } from '@interfaces/application'
import { DiiaIdAction } from '@interfaces/services/diiaId'
import { DocumentType } from '@interfaces/services/documents'
import {
    CountHistoryByActionResult,
    CreateDocumentFeaturePointsResponse,
    GetFeaturePointsResult,
    GetUserDocumentsResult,
    HistoryAction,
    ServiceUser,
} from '@interfaces/services/user'
import { AuthUser, AuthUserSessionType } from '@interfaces/services/userAuthToken'

export default class UserService {
    constructor(
        private readonly moleculer: MoleculerService,
        private readonly eventBus: EventBus,
    ) {}

    private readonly serviceName: string = 'User'

    async createOrUpdateProfile(user: AuthUser, headers: ActHeaders, sessionType: AuthUserSessionType): Promise<void> {
        switch (sessionType) {
            case SessionType.User:
            case SessionType.CabinetUser: {
                await this.createOrUpdateUserProfile(<UserTokenData>user, headers)
                break
            }
            case SessionType.EResident: {
                await this.createOrUpdateEResidentProfile(<EResidentTokenData>user, headers)
                break
            }
            case SessionType.EResidentApplicant: {
                break
            }
            default: {
                throw new AccessDeniedError('Unknown app user session type')
            }
        }
    }

    async areFeaturePointsExist(userIdentifier: string): Promise<boolean> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'areFeaturePointsExist', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier } },
        )
    }

    async getFeaturePoints(userIdentifier: string): Promise<GetFeaturePointsResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getFeaturePoints', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier } },
        )
    }

    async createDocumentFeaturePoints(
        userIdentifier: string | undefined,
        documentType: DocumentType,
        documentIdentifier: string,
        photo: string | undefined,
    ): Promise<CreateDocumentFeaturePointsResponse> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'createDocumentFeaturePoints', actionVersion: ActionVersion.V1 },
            {
                params: {
                    userIdentifier,
                    documentType,
                    documentIdentifier,
                    photo,
                },
            },
        )
    }

    async getUserDocuments(userIdentifier: string): Promise<GetUserDocumentsResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getUserDocuments', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier } },
        )
    }

    async hasOneOfDocuments(userIdentifier: string, documentTypes: DocumentType[]): Promise<boolean> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'hasOneOfDocuments', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier, documentTypes } },
        )
    }

    async hasDiiaIdIdentifier(userIdentifier: string, mobileUidToFilter: string): Promise<boolean> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'hasDiiaIdIdentifier', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier, mobileUidToFilter } },
        )
    }

    async registerDiiaIdAction(userIdentifier: string, action: DiiaIdAction): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'registerDiiaIdAction', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier, action } },
        )
    }

    async countHistoryByAction(action: HistoryAction, sessionId: string, user: UserTokenData): Promise<CountHistoryByActionResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'countHistoryByAction', actionVersion: ActionVersion.V1 },
            { params: { action, sessionId }, session: { sessionType: SessionType.User, user } },
        )
    }

    async getServiceUserByLogin(login: string): Promise<ServiceUser> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getServiceUserByLogin', actionVersion: ActionVersion.V1 },
            { params: { login } },
        )
    }

    async encryptDocumentInStorage(
        userIdentifier: string,
        documentType: DocumentType,
        dataToEncrypt: unknown,
        photoToEncrypt?: string,
        docPhotoToEncrypt?: string,
    ): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'encryptDocumentInStorage',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, documentType, dataToEncrypt, photoToEncrypt, docPhotoToEncrypt },
            },
        )
    }

    async decryptDocumentFromStorage<T>(userIdentifier: string, documentType: DocumentType): Promise<T> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'decryptDocumentFromStorage',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, documentType },
            },
        )
    }

    async addDocumentInStorage(userIdentifier: string, documentType: DocumentType, hashData: string, encryptedData: string): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'addDocumentInStorage',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, documentType, hashData, encryptedData },
            },
        )
    }

    private async createOrUpdateUserProfile(user: UserTokenData, headers: ActHeaders): Promise<void> {
        const { itn, gender, birthDay } = user

        await this.eventBus.publish(InternalEvent.AuthCreateOrUpdateUserProfile, { itn, gender, birthDay, headers })
    }

    private async createOrUpdateEResidentProfile(user: EResidentTokenData, headers: ActHeaders): Promise<void> {
        const { identifier, gender, birthDay } = user

        await this.eventBus.publish(InternalEvent.AuthCreateOrUpdateEResidentProfile, {
            userIdentifier: identifier,
            gender,
            birthDay,
            headers,
        })
    }
}
