import { randomUUID } from 'crypto'

import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import PhotoIdProvider from '@services/authMethods/photoId'
import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'

import { AppConfig } from '@interfaces/config'
import { PhotoIdAuthRequestModel } from '@interfaces/models/photoIdAuthRequest'

describe('PhotoIdProvider', () => {
    const testKit = new TestKit()
    const photoIdAuthRequestServiceMock = mockInstance(PhotoIdAuthRequestService)
    const config = <AppConfig>{ photoId: { authUrlHost: 'photo.id.ua' } }
    const photoIdProvider = new PhotoIdProvider(config, photoIdAuthRequestServiceMock)

    describe('method: requestAuthorizationUrl', () => {
        const headers = testKit.session.getHeaders()

        it('should successfully create photoId request and return auth url', async () => {
            const requestId = randomUUID()
            const {
                user: { identifier: userIdentifier },
            } = testKit.session.getUserSession()
            const {
                photoId: { authUrlHost },
            } = config

            jest.spyOn(photoIdAuthRequestServiceMock, 'createRequest').mockResolvedValueOnce(<PhotoIdAuthRequestModel>{ requestId })

            expect(await photoIdProvider.requestAuthorizationUrl({ userIdentifier }, headers)).toBe(`${authUrlHost}/${requestId}`)

            expect(photoIdAuthRequestServiceMock.createRequest).toHaveBeenCalledWith(userIdentifier, headers.mobileUid)
        })

        it('should fail in case user identifier is not provided', async () => {
            await expect(async () => {
                await photoIdProvider.requestAuthorizationUrl({}, headers)
            }).rejects.toEqual(new BadRequestError('User identifier is required'))
        })
    })

    describe('method: verify', () => {
        it('should successfully invoke photoId verification process', async () => {
            const requestId = randomUUID()
            const headers = testKit.session.getHeaders()
            const { mobileUid } = headers

            jest.spyOn(photoIdAuthRequestServiceMock, 'validateSuccessRequest').mockResolvedValueOnce()

            await photoIdProvider.verify(requestId, { headers })

            expect(photoIdAuthRequestServiceMock.validateSuccessRequest).toHaveBeenCalledWith(requestId, mobileUid)
        })
    })
})
