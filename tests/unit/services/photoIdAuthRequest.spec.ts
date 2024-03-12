import { randomUUID } from 'crypto'

const uuidv4 = jest.fn()
const randomUuid = randomUUID()

uuidv4.mockReturnValue(randomUuid)
jest.mock('uuid', () => ({ v4: uuidv4 }))
const photoIdAuthRequestModelMock = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    modelName: 'PhotoIdAuthRequest',
}

jest.mock('@models/photoIdAuthRequest', () => photoIdAuthRequestModelMock)

import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalEventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, BadRequestError, ModelNotFoundError, NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'
import UserService from '@services/user'

import { AppConfig } from '@interfaces/config'
import { PhotoIdAuthRequestModel } from '@interfaces/models/photoIdAuthRequest'
import { ProcessCode } from '@interfaces/services'

describe(`${PhotoIdAuthRequestService.name}`, () => {
    const testKit = new TestKit()
    const config = <AppConfig>(<unknown>{
        photoId: {
            authRequestExpirationMs: 1000,
        },
    })
    const loggerMock = mockInstance(DiiaLogger)
    const externalEventBusMock = mockInstance(ExternalEventBus)
    const userServiceMock = mockInstance(UserService)

    const photoIdAuthRequestService = new PhotoIdAuthRequestService(config, externalEventBusMock, loggerMock, userServiceMock)
    const { mobileUid } = testKit.session.getHeaders()
    const userIdentifier = 'userIdentifier'
    const requestId = 'requestId'

    describe('method: `createRequest`', () => {
        it('should throw NotFoundError if failed to fetch feature points', async () => {
            jest.spyOn(userServiceMock, 'getFeaturePoints').mockResolvedValueOnce({ points: [] })

            await expect(photoIdAuthRequestService.createRequest(userIdentifier, mobileUid)).rejects.toEqual(
                new NotFoundError('Could not find user feature points'),
            )
        })

        it('should return request model', async () => {
            const points = [
                {
                    documentType: 'documentType',
                    documentIdentifier: 'documentIdentifier',
                    points: [10, 10],
                },
            ]

            const requestModel = <PhotoIdAuthRequestModel>{}

            jest.spyOn(userServiceMock, 'getFeaturePoints').mockResolvedValueOnce({ points })
            jest.spyOn(photoIdAuthRequestModelMock, 'findOneAndUpdate').mockResolvedValueOnce(requestModel)
            jest.spyOn(externalEventBusMock, 'publish').mockResolvedValueOnce(true)

            expect(await photoIdAuthRequestService.createRequest(userIdentifier, mobileUid)).toMatchObject(requestModel)
        })
    })

    describe('method: `validateSuccessRequest`', () => {
        it('should throw ModelNotFoundError if failed to find request model', async () => {
            jest.spyOn(photoIdAuthRequestModelMock, 'findOne').mockResolvedValueOnce(null)

            await expect(photoIdAuthRequestService.validateSuccessRequest(requestId, mobileUid)).rejects.toEqual(
                new ModelNotFoundError(photoIdAuthRequestModelMock.modelName, requestId),
            )
        })

        it('should throw AccessDeniedError if request model expired', async () => {
            const pastExpirationDate = new Date()

            pastExpirationDate.setFullYear(pastExpirationDate.getFullYear() - 1)

            const requestModel = <PhotoIdAuthRequestModel>{
                expirationDate: pastExpirationDate,
            }

            jest.spyOn(photoIdAuthRequestModelMock, 'findOne').mockResolvedValueOnce(requestModel)

            await expect(photoIdAuthRequestService.validateSuccessRequest(requestId, mobileUid)).rejects.toEqual(
                new AccessDeniedError('Identification entity is expired', {}, ProcessCode.FailedVerifyUser),
            )
        })

        it('should throw BadRequestError if identification success false', async () => {
            const futureExpirationDate = new Date()

            futureExpirationDate.setFullYear(futureExpirationDate.getFullYear() + 1)

            const requestModel = <PhotoIdAuthRequestModel>{
                isIdentificationSuccess: false,
                expirationDate: futureExpirationDate,
            }

            jest.spyOn(photoIdAuthRequestModelMock, 'findOne').mockResolvedValueOnce(requestModel)

            await expect(photoIdAuthRequestService.validateSuccessRequest(requestId, mobileUid)).rejects.toEqual(
                new BadRequestError('Identification is not success', {}, ProcessCode.FailedVerifyUser),
            )
        })

        it('should successfully complete validation', async () => {
            const futureExpirationDate = new Date()

            futureExpirationDate.setFullYear(futureExpirationDate.getFullYear() + 1)

            const requestModel = {
                isIdentificationSuccess: true,
                expirationDate: futureExpirationDate,
                deleteOne: jest.fn(),
            }

            jest.spyOn(photoIdAuthRequestModelMock, 'findOne').mockResolvedValueOnce(requestModel)

            await photoIdAuthRequestService.validateSuccessRequest(requestId, mobileUid)
            expect(requestModel.deleteOne).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `deleteByMobileUid`', () => {
        it('should successfully delete request model by mobileUid', async () => {
            jest.spyOn(photoIdAuthRequestModelMock, 'deleteOne').mockResolvedValueOnce({ deletedCount: 1 })

            await photoIdAuthRequestService.deleteByMobileUid(mobileUid)
            expect(loggerMock.info).toHaveBeenCalledWith(`Deleted photoIdAuthRequestModel by ${mobileUid}`, { deletedCount: 1 })
        })
    })

    describe('method: `markRequestAsIdentified`', () => {
        it('should throw ModelNotFoundError if request model not found', async () => {
            jest.spyOn(photoIdAuthRequestModelMock, 'findOneAndUpdate').mockResolvedValueOnce(null)

            await expect(photoIdAuthRequestService.markRequestAsIdentified(requestId, [])).rejects.toEqual(
                new ModelNotFoundError(photoIdAuthRequestModelMock.modelName, requestId),
            )
        })

        it('should successfully update request model', async () => {
            const requestModel = {
                isIdentificationSuccess: true,
            }

            jest.spyOn(photoIdAuthRequestModelMock, 'findOneAndUpdate').mockResolvedValueOnce(requestModel)

            await photoIdAuthRequestService.markRequestAsIdentified(requestId, [])
            expect(photoIdAuthRequestModelMock.findOneAndUpdate).toHaveBeenCalledTimes(1)
        })
    })
})
