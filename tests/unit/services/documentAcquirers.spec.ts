import { MoleculerService } from '@diia-inhouse/diia-app'

import { mongo } from '@diia-inhouse/db'
import { mockInstance } from '@diia-inhouse/test'
import { ActionVersion, SessionType } from '@diia-inhouse/types'

import DocumentAcquirersService from '@services/documentAcquirers'

import { AppConfig } from '@interfaces/config'
import { OfferRequestType } from '@interfaces/services/documentAcquirers'

describe(`${DocumentAcquirersService.name}`, () => {
    const config = <AppConfig>(<unknown>{
        authService: {
            diiaSignature: {
                acquirerToken: 'acquirerToken',
                branchId: 'branchId',
                offerId: 'offerId',
            },
        },
    })

    let documentAcquirersService: DocumentAcquirersService
    let mockMoleculerService: MoleculerService

    beforeEach(() => {
        mockMoleculerService = mockInstance(MoleculerService)
        documentAcquirersService = new DocumentAcquirersService(mockMoleculerService, config)
    })

    describe('method: `getAcquirerIdByToken`', () => {
        it('should return acquirer id', async () => {
            const mockAcquirerToken = 'acquirerToken'
            const mockAcquirerId = new mongo.ObjectId()

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(mockAcquirerId)

            expect(await documentAcquirersService.getAcquirerIdByToken(mockAcquirerToken)).toBe(mockAcquirerId)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'DocumentAcquirers',
                { name: 'getAcquirerIdByToken', actionVersion: ActionVersion.V1 },
                { params: { acquirerToken: mockAcquirerToken } },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `getAcquirerIdByHashId`', () => {
        it('should return acquirer id', async () => {
            const mockAcquirerHashId = 'acquirerHashId'
            const mockAcquirerId = new mongo.ObjectId()
            const mockPartnerId = new mongo.ObjectId()

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(mockAcquirerId)

            expect(await documentAcquirersService.getAcquirerIdByHashId(mockAcquirerHashId, mockPartnerId)).toBe(mockAcquirerId)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'DocumentAcquirers',
                { name: 'getAcquirerIdByHashId', actionVersion: ActionVersion.V1 },
                { params: { acquirerHashId: mockAcquirerHashId, partnerId: mockPartnerId } },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `getServiceEntranceDataByOtp`', () => {
        it('should return otp object', async () => {
            const mockOtp = 'otp'
            const mockOtpResult = {
                acquirerId: new mongo.ObjectId(),
                branchHashId: 'branchHashId',
                offerHashId: 'offerHashId',
                offerRequestHashId: 'offerRequestHashId',
                offerRequestExpiration: 1000,
            }

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(mockOtpResult)

            expect(await documentAcquirersService.getServiceEntranceDataByOtp(mockOtp)).toMatchObject(mockOtpResult)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'DocumentAcquirers',
                { name: 'getServiceEntranceDataByOtp', actionVersion: ActionVersion.V1 },
                { params: { otp: mockOtp } },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `createOfferRequest`', () => {
        it('should return object with link', async () => {
            const mockRequestId = 'requestId'
            const mockOfferRequest = {
                deeplink: 'deeplink',
            }
            const mockAcquirerId = new mongo.ObjectId()
            const { branchId, offerId, acquirerToken } = config.authService.diiaSignature

            jest.spyOn(documentAcquirersService, 'getAcquirerIdByToken').mockResolvedValueOnce(mockAcquirerId)
            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(mockOfferRequest)

            expect(await documentAcquirersService.createOfferRequest(mockRequestId)).toMatchObject(mockOfferRequest)
            expect(documentAcquirersService.getAcquirerIdByToken).toHaveBeenCalledWith(acquirerToken)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'DocumentAcquirers',
                { name: 'createOfferRequest', actionVersion: ActionVersion.V2 },
                {
                    params: { branchId, offerId, offerRequestType: OfferRequestType.Dynamic, requestId: mockRequestId },
                    session: {
                        sessionType: SessionType.Acquirer,
                        acquirer: { _id: mockAcquirerId, sessionType: SessionType.Acquirer, refreshToken: null },
                    },
                },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })
})
