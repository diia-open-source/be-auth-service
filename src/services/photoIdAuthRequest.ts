import { FilterQuery, QueryOptions, UpdateQuery } from 'mongoose'
import { v4 as uuid } from 'uuid'

import { ExternalEvent, ExternalEventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, BadRequestError, ModelNotFoundError, NotFoundError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import UserService from '@services/user'

import photoIdAuthRequestModel from '@models/photoIdAuthRequest'

import { AppConfig } from '@interfaces/config'
import {
    FaceRecoAuthPhotoVerificationRequest,
    FaceRecoMatchedPhoto,
} from '@interfaces/externalEventListeners/faceRecoAuthPhotoVerification'
import { PhotoIdAuthRequestModel } from '@interfaces/models/photoIdAuthRequest'
import { ProcessCode } from '@interfaces/services'

export default class PhotoIdAuthRequestService {
    constructor(
        private readonly config: AppConfig,
        private readonly externalEventBus: ExternalEventBus,
        private readonly logger: Logger,

        private readonly userService: UserService,
    ) {}

    private readonly expirationTime = this.config.photoId.authRequestExpirationMs

    async createRequest(userIdentifier: string, mobileUid: string): Promise<PhotoIdAuthRequestModel> {
        const { points } = await this.userService.getFeaturePoints(userIdentifier)
        if (!points.length) {
            throw new NotFoundError('Could not find user feature points')
        }

        const requestId = uuid()

        const query: FilterQuery<PhotoIdAuthRequestModel> = { mobileUid }
        const modifier: UpdateQuery<PhotoIdAuthRequestModel> = {
            $set: {
                userIdentifier,
                requestId,
                expirationDate: new Date(Date.now() + this.expirationTime),
            },
            $unset: {
                identificationResult: 1,
                isIdentificationSuccess: 1,
            },
        }

        const authRequest: PhotoIdAuthRequestModel = await photoIdAuthRequestModel.findOneAndUpdate(query, modifier, {
            upsert: true,
            new: true,
        })
        const request: FaceRecoAuthPhotoVerificationRequest = {
            requestId,
            documents: points,
        }

        await this.externalEventBus.publish(ExternalEvent.FaceRecoAuthPhotoVerification, { uuid: uuid(), request })

        return authRequest
    }

    async validateSuccessRequest(requestId: string, mobileUid: string): Promise<void> {
        const request = await photoIdAuthRequestModel.findOne({ requestId, mobileUid })
        if (!request) {
            throw new ModelNotFoundError(photoIdAuthRequestModel.modelName, requestId)
        }

        if (request.expirationDate.getTime() <= Date.now()) {
            throw new AccessDeniedError('Identification entity is expired', {}, ProcessCode.FailedVerifyUser)
        }

        if (!request.isIdentificationSuccess) {
            throw new BadRequestError('Identification is not success', {}, ProcessCode.FailedVerifyUser)
        }

        await request.deleteOne()
    }

    async deleteByMobileUid(mobileUid: string): Promise<void> {
        const query: FilterQuery<PhotoIdAuthRequestModel> = { mobileUid }

        const { deletedCount } = await photoIdAuthRequestModel.deleteOne(query)

        this.logger.info(`Deleted photoIdAuthRequestModel by ${mobileUid}`, { deletedCount })
    }

    async markRequestAsIdentified(requestId: string, documents: FaceRecoMatchedPhoto[]): Promise<void> {
        const query: FilterQuery<PhotoIdAuthRequestModel> = { requestId }
        const modifier: UpdateQuery<PhotoIdAuthRequestModel> = {
            isIdentificationSuccess: documents.some(({ matched }: FaceRecoMatchedPhoto) => matched),
            identificationResult: documents,
        }
        const options: QueryOptions = { projection: { _id: 1 } }
        const request = await photoIdAuthRequestModel.findOneAndUpdate(query, modifier, options)
        if (!request) {
            throw new ModelNotFoundError(photoIdAuthRequestModel.modelName, requestId)
        }
    }
}
