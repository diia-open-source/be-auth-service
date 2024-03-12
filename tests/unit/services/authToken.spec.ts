import { randomUUID } from 'crypto'

import { ObjectId } from 'bson'

import { AuthService, IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { EventBus, InternalEvent } from '@diia-inhouse/diia-queue'
import {
    AccessDeniedError,
    ApiError,
    ErrorType,
    ModelNotFoundError,
    NotFoundError,
    ServiceUnavailableError,
    UnauthorizedError,
} from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import {
    PartnerPaymentScope,
    PartnerScopeType,
    PortalUser,
    PortalUserPetitionPermissions,
    PortalUserPollPermissions,
    PortalUserTokenData,
    SessionType,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import Utils from '@src/utils'

import AuthTokenService from '@services/authToken'
import BackOfficePetitionService from '@services/backOfficePetition'
import DocumentAcquirersService from '@services/documentAcquirers'
import PartnerService from '@services/partner'
import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'
import RefreshTokenService from '@services/refreshToken'
import TokenCacheService from '@services/tokenCache'
import TokenExpirationService from '@services/tokenExpiration'
import TwoFactorService from '@services/twoFactor'
import UserService from '@services/user'
import VoteService from '@services/vote'

import { generateItn } from '@tests/mocks/randomData'

import { AppConfig } from '@interfaces/config'
import { RefreshTokenModel } from '@interfaces/models/refreshToken'

describe(`${AuthTokenService.name}`, () => {
    const testKit = new TestKit()
    const testItn = testKit.random.getRandomInt(1, 9998).toString()
    const config = <AppConfig>(<unknown>{
        applicationStoreReview: {
            testItn,
        },
        auth: {
            testAuthByItnIsEnabled: true,
            checkingForValidItnIsEnabled: true,
            jwk: randomUUID(),
            jwt: {
                privateKey: randomUUID(),
                publicKey: randomUUID(),
                tokenSignOptions: {
                    algorithm: 'SHA256',
                    expiresIn: '30m',
                },
                tokenVerifyOptions: {
                    algorithms: ['SHA256'],
                    ignoreExpiration: false,
                },
            },
        },
        fld: {
            certFilePath: 'secrets/fld-config.key',
        },
    })
    const logger = mockInstance(DiiaLogger)
    const mockEventBus = mockInstance(EventBus)
    const identifierService = mockInstance(IdentifierService)
    const mockAuthService = mockInstance(AuthService)
    const mockDocumentAcquirersService = mockInstance(DocumentAcquirersService)
    const mockBackOfficePetitionService = mockInstance(BackOfficePetitionService)
    const mockPartnerService = mockInstance(PartnerService)
    const mockRefreshTokenService = mockInstance(RefreshTokenService)
    const mockUserService = mockInstance(UserService)
    const mockTwoFactorService = mockInstance(TwoFactorService)
    const utilsMock = mockInstance(Utils)
    const mockVoteService = mockInstance(VoteService)
    const mockTokenCacheService = mockInstance(TokenCacheService)
    const mockTokenExpirationService = mockInstance(TokenExpirationService)
    const mockPhotoIdAuthRequestService = mockInstance(PhotoIdAuthRequestService)

    jest.spyOn(utils, 'handleError').mockImplementation((error: unknown, callback: (error: ApiError) => unknown): unknown => {
        callback(<ApiError>error)

        return null
    })

    const authTokenService = new AuthTokenService(
        config,
        mockAuthService,
        logger,
        identifierService,
        mockEventBus,
        utilsMock,
        mockBackOfficePetitionService,
        mockDocumentAcquirersService,
        mockPartnerService,
        mockPhotoIdAuthRequestService,
        mockRefreshTokenService,
        mockTokenCacheService,
        mockTwoFactorService,
        mockUserService,
        mockVoteService,
        mockTokenExpirationService,
    )

    describe('method: `getAcquirerAuthToken`', () => {
        it('should return acquirer auth token', async () => {
            const acquirerId: ObjectId = new ObjectId()
            const mockRefreshToken = { value: 'test-value', expirationTime: 1000 }
            const mockToken = 'token'

            jest.spyOn(mockDocumentAcquirersService, 'getAcquirerIdByToken').mockResolvedValueOnce(acquirerId)

            jest.spyOn(mockRefreshTokenService, 'create').mockResolvedValueOnce(mockRefreshToken)

            jest.spyOn(mockAuthService, 'getJweInJwt').mockResolvedValueOnce(mockToken)

            await expect(authTokenService.getAcquirerAuthToken('acquirerToken', 'traceId')).resolves.toBe(mockToken)
            expect(mockDocumentAcquirersService.getAcquirerIdByToken).toHaveBeenCalledWith('acquirerToken')
            expect(mockRefreshTokenService.create).toHaveBeenCalledWith('traceId', SessionType.Acquirer)
            expect(mockAuthService.getJweInJwt).toHaveBeenCalledWith({
                _id: acquirerId,
                refreshToken: mockRefreshToken,
                sessionType: SessionType.Acquirer,
            })
        })

        it('should throw UnauthorizedError if generating auth token failed with 404 status code', async () => {
            jest.spyOn(mockDocumentAcquirersService, 'getAcquirerIdByToken').mockRejectedValueOnce(new NotFoundError())

            await expect(authTokenService.getAcquirerAuthToken('acquirerToken', 'traceId')).rejects.toEqual(
                new UnauthorizedError(`Acquirer not found by the provided token acquirerToken`, undefined, ErrorType.Operated),
            )
        })

        it('should throw ServiceUnavailableError if failed auth token generating process', async () => {
            jest.spyOn(mockDocumentAcquirersService, 'getAcquirerIdByToken').mockRejectedValueOnce(null)

            await expect(authTokenService.getAcquirerAuthToken('acquirerToken', 'traceId')).rejects.toEqual(
                new ServiceUnavailableError('Failed to get acquirer auth token'),
            )
        })
    })

    describe('method: `getPartnerAcquirerAuthToken`', () => {
        it('should return partner acquirer auth token', async () => {
            const acquirerId: ObjectId = new ObjectId()
            const mockRefreshToken = { value: 'test-value', expirationTime: 1000 }
            const mockToken = 'token'
            const mockPartnerId: ObjectId = new ObjectId()

            jest.spyOn(mockDocumentAcquirersService, 'getAcquirerIdByHashId').mockResolvedValueOnce({ acquirerId })

            jest.spyOn(mockRefreshTokenService, 'create').mockResolvedValueOnce(mockRefreshToken)

            jest.spyOn(mockAuthService, 'getJweInJwt').mockResolvedValueOnce(mockToken)

            await expect(authTokenService.getPartnerAcquirerAuthToken('acquirerHashId', mockPartnerId, 'traceId')).resolves.toBe(mockToken)
            expect(mockDocumentAcquirersService.getAcquirerIdByHashId).toHaveBeenCalledWith('acquirerHashId', mockPartnerId)
            expect(mockRefreshTokenService.create).toHaveBeenCalledWith('traceId', SessionType.Acquirer)
            expect(mockAuthService.getJweInJwt).toHaveBeenCalledWith({
                _id: acquirerId,
                partnerId: mockPartnerId,
                refreshToken: mockRefreshToken,
                sessionType: SessionType.Acquirer,
            })
        })

        it('should throw UnauthorizedError if acquirer not found by the provided id', async () => {
            jest.spyOn(mockDocumentAcquirersService, 'getAcquirerIdByHashId').mockRejectedValueOnce(new NotFoundError())

            const mockPartnerId: ObjectId = new ObjectId()

            await expect(authTokenService.getPartnerAcquirerAuthToken('acquirerHashId', mockPartnerId, 'traceId')).rejects.toEqual(
                new UnauthorizedError(`Acquirer not found by the provided id acquirerHashId`),
            )
        })
    })

    describe('method: `getPartnerAuthToken`', () => {
        it('should return partner auth token', async () => {
            const partnerId: ObjectId = new ObjectId()
            const mockRefreshToken = { value: 'test-value', expirationTime: 1000 }
            const mockPartnerToken = {
                _id: partnerId,
                scopes: {
                    [PartnerScopeType.payment]: [PartnerPaymentScope.Debt, PartnerPaymentScope.Penalty],
                },
            }
            const mockToken = 'token'

            jest.spyOn(mockPartnerService, 'getPartnerByToken').mockResolvedValueOnce(mockPartnerToken)

            jest.spyOn(mockRefreshTokenService, 'create').mockResolvedValueOnce(mockRefreshToken)

            jest.spyOn(mockAuthService, 'getJweInJwt').mockResolvedValueOnce(mockToken)

            await expect(authTokenService.getPartnerAuthToken('partnerToken', 'traceId')).resolves.toBe(mockToken)
            expect(mockPartnerService.getPartnerByToken).toHaveBeenCalledWith('partnerToken')
            expect(mockRefreshTokenService.create).toHaveBeenCalledWith('traceId', SessionType.Partner)
            expect(mockAuthService.getJweInJwt).toHaveBeenCalledWith({
                _id: partnerId.toString(),
                scopes: mockPartnerToken.scopes,
                refreshToken: mockRefreshToken,
                sessionType: SessionType.Partner,
            })
        })

        it('should throw UnauthorizedError if partner not found by the provided token', async () => {
            jest.spyOn(mockPartnerService, 'getPartnerByToken').mockRejectedValueOnce(new NotFoundError())

            await expect(authTokenService.getPartnerAuthToken('partnerToken', 'traceId')).rejects.toEqual(
                new ModelNotFoundError(`Partner not found by the provided token`, 'partnerToken', {}, undefined, ErrorType.Operated),
            )
        })

        it('should throw same error when throwed is not not found error', async () => {
            jest.spyOn(mockPartnerService, 'getPartnerByToken').mockRejectedValueOnce(new AccessDeniedError())

            await expect(authTokenService.getPartnerAuthToken('partnerToken', 'traceId')).rejects.toEqual(new AccessDeniedError())
        })
    })

    describe('method: `getServiceUserAuthToken`', () => {
        const inputParams = { loginParam: 'log', password: undefined, twoFactorCode: 'sec', traceId: 'traceId' }
        const mockUserInfo = { login: 'log', hashedPassword: 'pass', twoFactorSecret: 'sec' }

        it('should return service user auth token', async () => {
            const mockRefreshToken = { value: 'token', expirationTime: 1000 }
            const mockToken = 'token'
            const customLifetime = 2_592_000_000
            const mockSession = { login: mockUserInfo.login, sessionType: SessionType.ServiceUser, refreshToken: mockRefreshToken }

            jest.spyOn(mockUserService, 'getServiceUserByLogin').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(mockTwoFactorService, 'verifyServiceUserCode').mockResolvedValueOnce()

            jest.spyOn(mockRefreshTokenService, 'removeTokensByLogin').mockResolvedValueOnce()

            jest.spyOn(mockRefreshTokenService, 'create').mockResolvedValueOnce(mockRefreshToken)

            jest.spyOn(mockAuthService, 'getJweInJwt').mockResolvedValueOnce(mockToken)

            await expect(
                authTokenService.getServiceUserAuthToken(
                    inputParams.loginParam,
                    inputParams.password,
                    inputParams.twoFactorCode,
                    inputParams.traceId,
                ),
            ).resolves.toBe(mockToken)
            expect(mockUserService.getServiceUserByLogin).toHaveBeenCalledWith(inputParams.loginParam)
            expect(mockTwoFactorService.verifyServiceUserCode).toHaveBeenCalledWith(mockUserInfo.twoFactorSecret, inputParams.twoFactorCode)
            expect(mockRefreshTokenService.removeTokensByLogin).toHaveBeenCalledWith(mockUserInfo.login, SessionType.ServiceUser)
            expect(mockRefreshTokenService.create).toHaveBeenCalledWith(inputParams.traceId, SessionType.ServiceUser, { customLifetime })
            expect(mockAuthService.getJweInJwt).toHaveBeenCalledWith(mockSession)
        })

        it('should throw AccessDeniedError if password not valid', async () => {
            jest.spyOn(mockUserService, 'getServiceUserByLogin').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(mockTwoFactorService, 'verifyServiceUserCode').mockResolvedValueOnce()

            await expect(
                authTokenService.getServiceUserAuthToken(inputParams.loginParam, 'pass', inputParams.twoFactorCode, inputParams.traceId),
            ).rejects.toEqual(new AccessDeniedError(`Password is not valid`))
        })
    })

    describe('method: `getPortalUserToken`', () => {
        it('should return portal user token', async () => {
            const mockIdentifier = 'identifier'
            const mockToken = 'token'
            const mockRefreshToken = { value: 'test-value', expirationTime: 1000 }
            const mockItn: string = generateItn()
            const inputPortalUser: PortalUser = {
                fName: 'first name',
                lName: 'last name',
                mName: 'middle name',
                itn: mockItn,
                birthDay: '24.08.1991',
            }

            const mockPermissions = {
                petition: PortalUserPetitionPermissions.administrator,
                poll: PortalUserPollPermissions.masterAdministrator,
            }

            const tokenData: PortalUserTokenData = {
                ...inputPortalUser,
                birthDay: utilsMock.normalizeBirthDay(inputPortalUser.birthDay),
                identifier: mockIdentifier,
                refreshToken: mockRefreshToken,
                sessionType: SessionType.PortalUser,
                permissions: mockPermissions,
            }

            jest.spyOn(identifierService, 'createIdentifier').mockReturnValueOnce(mockIdentifier)

            jest.spyOn(mockRefreshTokenService, 'removeTokensByUserIdentifier').mockResolvedValueOnce()

            jest.spyOn(mockRefreshTokenService, 'create').mockResolvedValueOnce(mockRefreshToken)

            jest.spyOn(mockBackOfficePetitionService, 'getPortalUserPermissions').mockResolvedValueOnce(mockPermissions)

            jest.spyOn(mockAuthService, 'getJweInJwt').mockResolvedValueOnce(mockToken)

            jest.spyOn(mockVoteService, 'joinUserToPetitions').mockResolvedValueOnce()

            await expect(authTokenService.getPortalUserToken(inputPortalUser, 'traceId')).resolves.toBe(mockToken)
            expect(identifierService.createIdentifier).toHaveBeenCalledWith(inputPortalUser.itn)
            expect(mockRefreshTokenService.removeTokensByUserIdentifier).toHaveBeenCalledWith(mockIdentifier, SessionType.PortalUser)
            expect(mockBackOfficePetitionService.getPortalUserPermissions).toHaveBeenCalledWith(mockIdentifier)
            expect(mockAuthService.getJweInJwt).toHaveBeenCalledWith(tokenData)
            expect(mockVoteService.joinUserToPetitions).toHaveBeenCalledWith(tokenData)
        })
    })

    describe('method: `deleteEntitiesByOfferRequestHashId`', () => {
        it('should delete entities', async () => {
            const mockTokens: Pick<RefreshTokenModel, 'value' | 'sessionType'>[] = [
                { value: 'value1', sessionType: SessionType.PortalUser },
            ]

            jest.spyOn(mockRefreshTokenService, 'removeTokensByEntityId').mockResolvedValueOnce(mockTokens)

            jest.spyOn(mockTokenCacheService, 'revokeRefreshToken').mockResolvedValueOnce()
            jest.spyOn(mockTokenExpirationService, 'getTokenExpirationInSecondsBySessionType').mockReturnValueOnce(0)

            await authTokenService.deleteEntitiesByOfferRequestHashId('hashId')
            expect(mockRefreshTokenService.removeTokensByEntityId).toHaveBeenCalledWith('hashId')
            expect(mockTokenCacheService.revokeRefreshToken).toHaveBeenCalledWith(mockTokens[0].value, 0)
        })

        it('should throw Error if failed to process task on clear user session data', async () => {
            const mockTokens: Pick<RefreshTokenModel, 'value' | 'sessionType'>[] = [
                { value: 'value1', sessionType: SessionType.PortalUser },
            ]

            jest.spyOn(mockRefreshTokenService, 'removeTokensByEntityId').mockResolvedValueOnce(mockTokens)

            jest.spyOn(mockTokenCacheService, 'revokeRefreshToken').mockResolvedValueOnce()
            jest.spyOn(mockTokenExpirationService, 'getTokenExpirationInSecondsBySessionType').mockReturnValueOnce(0)

            Promise.all = jest.fn(() => Promise.reject(new Error('Task failed')))

            await authTokenService.deleteEntitiesByOfferRequestHashId('hashId')

            expect(logger.fatal).toHaveBeenCalledWith('Failed to process task on clear user session data', {
                err: new Error('Task failed'),
            })
        })
    })

    describe('method: `clearUserSessionData`', () => {
        it('should delete user sessions data', async () => {
            const mockRefreshTokens: RefreshTokenModel[] = [<RefreshTokenModel>{ value: 'value1', sessionType: SessionType.PortalUser }]
            const mockMobileUuid = randomUUID()

            jest.spyOn(mockRefreshTokenService, 'getTokensByMobileUid').mockResolvedValueOnce(mockRefreshTokens)

            jest.spyOn(mockTokenCacheService, 'revokeRefreshToken').mockResolvedValueOnce()
            jest.spyOn(mockTokenExpirationService, 'getTokenExpirationInSecondsBySessionType').mockReturnValueOnce(0)

            jest.spyOn(mockPhotoIdAuthRequestService, 'deleteByMobileUid').mockResolvedValueOnce()
            jest.spyOn(mockRefreshTokenService, 'removeTokensByMobileUid').mockResolvedValueOnce()
            jest.spyOn(mockEventBus, 'publish').mockResolvedValueOnce(true)

            await authTokenService.clearUserSessionData('identifier', mockMobileUuid)
            expect(mockRefreshTokenService.getTokensByMobileUid).toHaveBeenCalledWith(mockMobileUuid)
            expect(mockTokenCacheService.revokeRefreshToken).toHaveBeenCalledWith(mockRefreshTokens[0].value, 0)
            expect(mockTokenExpirationService.getTokenExpirationInSecondsBySessionType).toHaveBeenCalledWith(SessionType.PortalUser)

            expect(mockPhotoIdAuthRequestService.deleteByMobileUid).toHaveBeenCalledWith(mockMobileUuid)
            expect(mockRefreshTokenService.removeTokensByMobileUid).toHaveBeenCalledWith(mockMobileUuid)
            expect(mockEventBus.publish).toHaveBeenCalledWith(InternalEvent.AuthUserLogOut, {
                mobileUid: mockMobileUuid,
                userIdentifier: 'identifier',
            })
        })

        it('should throw Error if failed to process task on clear user session data', async () => {
            const mockRefreshTokens: RefreshTokenModel[] = [<RefreshTokenModel>{ value: 'value1', sessionType: SessionType.PortalUser }]
            const mockMobileUuid = randomUUID()

            jest.spyOn(mockRefreshTokenService, 'getTokensByMobileUid').mockResolvedValueOnce(mockRefreshTokens)

            jest.spyOn(mockTokenCacheService, 'revokeRefreshToken').mockResolvedValueOnce()
            jest.spyOn(mockTokenExpirationService, 'getTokenExpirationInSecondsBySessionType').mockReturnValueOnce(0)

            jest.spyOn(mockPhotoIdAuthRequestService, 'deleteByMobileUid').mockResolvedValueOnce()
            jest.spyOn(mockRefreshTokenService, 'removeTokensByMobileUid').mockResolvedValueOnce()
            jest.spyOn(mockEventBus, 'publish').mockResolvedValueOnce(true)

            Promise.all = jest.fn(() => Promise.reject(new Error('Task failed')))

            await authTokenService.clearUserSessionData('identifier', mockMobileUuid)

            expect(logger.fatal).toHaveBeenCalledWith('Failed to process task on clear user session data', {
                err: new Error('Task failed'),
            })
        })
    })

    describe('method: `checkForValidItn`', () => {
        it('should return undefined when checking for valid ITN is disabled', () => {
            const itn: string = generateItn()
            const copyConfig = structuredClone(config)

            copyConfig.auth.checkingForValidItnIsEnabled = false

            const newAuthTokenService = new AuthTokenService(
                copyConfig,
                mockAuthService,
                logger,
                identifierService,
                mockEventBus,
                utilsMock,
                mockBackOfficePetitionService,
                mockDocumentAcquirersService,
                mockPartnerService,
                mockPhotoIdAuthRequestService,
                mockRefreshTokenService,
                mockTokenCacheService,
                mockTwoFactorService,
                mockUserService,
                mockVoteService,
                mockTokenExpirationService,
            )

            const result = newAuthTokenService.checkForValidItn(itn)

            expect(result).toBeUndefined()
        })

        it('should return undefined when given Itn equals test Itn', () => {
            const itn: string = generateItn()
            const copyConfig = structuredClone(config)

            copyConfig.auth.checkingForValidItnIsEnabled = true
            copyConfig.applicationStoreReview.testItn = itn

            const newAuthTokenService = new AuthTokenService(
                copyConfig,
                mockAuthService,
                logger,
                identifierService,
                mockEventBus,
                utilsMock,
                mockBackOfficePetitionService,
                mockDocumentAcquirersService,
                mockPartnerService,
                mockPhotoIdAuthRequestService,
                mockRefreshTokenService,
                mockTokenCacheService,
                mockTwoFactorService,
                mockUserService,
                mockVoteService,
                mockTokenExpirationService,
            )

            const result = newAuthTokenService.checkForValidItn(itn)

            expect(result).toBeUndefined()
        })

        it('should throw UnauthorizedError when Itn consists of zeros', () => {
            const itn = '0000000000'
            const copyConfig = structuredClone(config)

            copyConfig.auth.checkingForValidItnIsEnabled = true
            copyConfig.applicationStoreReview.testItn = undefined

            const newAuthTokenService = new AuthTokenService(
                copyConfig,
                mockAuthService,
                logger,
                identifierService,
                mockEventBus,
                utilsMock,
                mockBackOfficePetitionService,
                mockDocumentAcquirersService,
                mockPartnerService,
                mockPhotoIdAuthRequestService,
                mockRefreshTokenService,
                mockTokenCacheService,
                mockTwoFactorService,
                mockUserService,
                mockVoteService,
                mockTokenExpirationService,
            )

            expect(() => {
                newAuthTokenService.checkForValidItn(itn)
            }).toThrow(new UnauthorizedError())
            expect(logger.error).toHaveBeenCalledWith('Itn consists of zeros')
        })

        it('should throw UnauthorizedError when Itn is not valid', () => {
            const itn = 'ddd555'
            const copyConfig = structuredClone(config)

            copyConfig.auth.checkingForValidItnIsEnabled = true
            copyConfig.applicationStoreReview.testItn = undefined

            const newAuthTokenService = new AuthTokenService(
                copyConfig,
                mockAuthService,
                logger,
                identifierService,
                mockEventBus,
                utilsMock,
                mockBackOfficePetitionService,
                mockDocumentAcquirersService,
                mockPartnerService,
                mockPhotoIdAuthRequestService,
                mockRefreshTokenService,
                mockTokenCacheService,
                mockTwoFactorService,
                mockUserService,
                mockVoteService,
                mockTokenExpirationService,
            )

            expect(() => {
                newAuthTokenService.checkForValidItn(itn)
            }).toThrow(new UnauthorizedError())
            expect(logger.error).toHaveBeenCalledWith('Itn is not valid', {
                rawItn: itn,
            })
        })
    })
})
