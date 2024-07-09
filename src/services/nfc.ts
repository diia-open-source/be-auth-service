import { IdentifierService } from '@diia-inhouse/crypto'
import { ExternalCommunicator, ExternalEventBus } from '@diia-inhouse/diia-queue'
import { InternalServerError, ModelNotFoundError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import { Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import UserService from '@services/user'

import NfcDataMapper from '@dataMappers/nfcDataMapper'

import { ExternalEvent } from '@interfaces/application'
import { FaceRecoAuthPhotoVerificationRequest } from '@interfaces/externalEventListeners/faceRecoAuthPhotoVerification'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'
import { DocumentType, DocumentTypeCamelCase } from '@interfaces/services/documents'
import { AuthGetInnByUnzrResponse, NfcVerificationRequest, VerifyPhotoResult } from '@interfaces/services/nfc'

export default class NfcService {
    constructor(
        private readonly cache: CacheService,
        private readonly logger: Logger,
        private readonly external: ExternalCommunicator,
        private readonly identifier: IdentifierService,
        private readonly externalEventBus: ExternalEventBus,

        private readonly userService: UserService,
        private readonly nfcDataMapper: NfcDataMapper,
    ) {}

    private readonly cacheTtlInSec = 60 * 10

    private readonly userPhotoVerifiedCacheKeyPrefix = 'nfc.user.photo.verification.'

    private readonly userDataCacheKeyPrefix = 'nfc.user.data.'

    private readonly nfcVerificationKeyPrefix = 'facerecognition.nfc.user.verification.'

    async saveUserPhotoVerificationResult(mobileUid: string, isPhotoVerified: boolean): Promise<void> {
        await this.cache.set(
            `${this.userPhotoVerifiedCacheKeyPrefix}${mobileUid}`,
            JSON.stringify({ verified: isPhotoVerified }),
            this.cacheTtlInSec,
        )
    }

    async saveUserData(mobileUid: string, userData: NfcUserDTO): Promise<void> {
        await this.cache.set(`${this.userDataCacheKeyPrefix}${mobileUid}`, JSON.stringify(userData), this.cacheTtlInSec)
    }

    async isUserPhotoVerified(mobileUid: string): Promise<boolean> {
        const cacheData = await this.cache.get(`${this.userPhotoVerifiedCacheKeyPrefix}${mobileUid}`)
        if (!cacheData) {
            this.logger.error('No cache about photo verification')

            return false
        }

        const verifyPhotoResult: VerifyPhotoResult = JSON.parse(cacheData)

        this.logger.info('User photo verification result', { verifyPhotoResult })

        return verifyPhotoResult?.verified === true
    }

    async getUserDataFromCache(mobileUid: string): Promise<NfcUserDTO> {
        const key = `${this.userDataCacheKeyPrefix}${mobileUid}`
        const cacheData = await this.cache.get(key)

        await this.cache.remove(key)

        return cacheData ? JSON.parse(cacheData) : {}
    }

    async nfcUserDataExists(mobileUid: string): Promise<boolean> {
        return (await this.cache.get(`${this.userDataCacheKeyPrefix}${mobileUid}`)) !== null
    }

    async saveNfcVerificationRequest(mobileUid: string, request: NfcVerificationRequest): Promise<void> {
        await this.cache.set(`${this.nfcVerificationKeyPrefix}${mobileUid}`, JSON.stringify(request), this.cacheTtlInSec)
    }

    async saveNfcScanResult(mobileUid: string, userData: NfcUserDTO): Promise<string> {
        const verificationRequestKey = `${this.nfcVerificationKeyPrefix}${mobileUid}`
        const nfcVerificationRequestJson = await this.cache.get(verificationRequestKey)
        if (!nfcVerificationRequestJson) {
            throw new ModelNotFoundError(this.nfcVerificationKeyPrefix, mobileUid)
        }

        await this.cache.remove(verificationRequestKey)

        const nfcVerificationRequest: NfcVerificationRequest = JSON.parse(nfcVerificationRequestJson)

        if (!userData.itn && !userData.international) {
            this.logger.info('Start exchange unzr on rnokpp')
            try {
                const innByUnzrResponse = await this.external.receive<AuthGetInnByUnzrResponse>(
                    ExternalEvent.AuthGetInnByUnzr,
                    this.nfcDataMapper.toEntity(userData),
                )

                if (!innByUnzrResponse) {
                    throw new Error('Failed to fetch innByUnzrResponse')
                }

                const { rnokpp, firstname, lastname, middlename } = innByUnzrResponse

                if (!rnokpp) {
                    throw new InternalServerError('Unable to proceed without rnokpp')
                }

                this.logger.info('Successfully exchanged unzr on rnokpp')

                userData.itn = rnokpp
                userData.firstName = firstname
                userData.lastName = lastname
                userData.middleName = middlename || ''
            } catch (err) {
                const isResidencePermitDocument = [
                    DocumentTypeCamelCase.residencePermitPermanent,
                    DocumentTypeCamelCase.residencePermitTemporary,
                ].includes(userData.docType)

                const errorMessage = 'Failed to exchange unzr on rnokpp'

                this.logger.error(errorMessage, { err })

                if (!isResidencePermitDocument) {
                    throw new Error(errorMessage)
                }
            }
        }

        const { docNumber, docType, photo, itn } = userData

        const documentType = <DocumentType>utils.camelCaseToDocumentType(docType)
        const documentIdentifier = this.identifier.createIdentifier(docNumber)
        const userIdentifier = this.nfcDataIdentifier(itn)

        const { points } = await this.userService.createDocumentFeaturePoints(userIdentifier, documentType, documentIdentifier, photo)

        const request: FaceRecoAuthPhotoVerificationRequest = {
            requestId: mobileUid, // todo use requestId from authUrl for ios and later for android when it will be implemented
            documents: [
                {
                    points,
                    documentIdentifier,
                    documentType,
                },
            ],
        }

        await this.saveUserData(mobileUid, userData)
        await this.externalEventBus.publish(ExternalEvent.FaceRecoAuthPhotoVerification, { uuid: nfcVerificationRequest.uuid, request })

        this.logger.info(`Successfully saved user data for session ${mobileUid}`)

        return mobileUid
    }

    private nfcDataIdentifier(itn: string | undefined): string | undefined {
        if (!itn) {
            return
        }

        return this.identifier.createIdentifier(itn)
    }
}
