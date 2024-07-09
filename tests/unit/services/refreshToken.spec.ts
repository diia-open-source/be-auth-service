import { IdentifierService } from '@diia-inhouse/crypto'
import { FilterQuery } from '@diia-inhouse/db'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { EventBus } from '@diia-inhouse/diia-queue'
import { ModelNotFoundError, UnauthorizedError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import { GenerateRefreshTokenHelper } from '@src/helpers/generateRefreshToken'

const refreshTokenModelMock = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    limit: jest.fn(),
    save: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    modelName: 'refreshToken',
}

jest.mock('@models/refreshToken', () => refreshTokenModelMock)

import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'
import RefreshTokenService from '@services/refreshToken'
import TokenCacheService from '@services/tokenCache'
import TokenExpirationService from '@services/tokenExpiration'

import { InternalEvent } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'
import { RefreshTokenModel } from '@interfaces/models/refreshToken'
import { ProcessCode } from '@interfaces/services'

describe(`${RefreshTokenService.name}`, () => {
    const testKit = new TestKit()
    const headers = testKit.session.getHeaders()
    const config = <AppConfig>(<unknown>{
        authService: {
            refreshTokenLifetime: 1000,
        },
    })
    const loggerServiceMock = mockInstance(DiiaLogger)
    const eventBusMock = mockInstance(EventBus)
    const tokenCacheServiceMock = mockInstance(TokenCacheService)
    const photoIdAuthRequestServiceMock = mockInstance(PhotoIdAuthRequestService)
    const identifierServiceMock = mockInstance(IdentifierService)
    const tokenExpirationServiceMock = mockInstance(TokenExpirationService)

    const refreshTokenService = new RefreshTokenService(
        config,
        loggerServiceMock,
        eventBusMock,
        tokenCacheServiceMock,
        photoIdAuthRequestServiceMock,
        identifierServiceMock,
        tokenExpirationServiceMock,
    )

    describe('method: `create`', () => {
        const eisTraceId = 'eisTraceId'
        const sessionType = SessionType.Acquirer
        const ops = {
            mobileUid: 'mobileUid',
            authEntryPoint: { target: 'target', isBankId: true },
            entityId: 'entityId',
            userIdentifier: 'userIdentifier',
            login: 'login',
        }

        it('should return created token', async () => {
            const currentDate = Date.now()

            jest.spyOn(Date, 'now').mockImplementation(() => currentDate)

            jest.spyOn(refreshTokenModelMock, 'create').mockResolvedValueOnce({})
            expect(await refreshTokenService.create(eisTraceId, sessionType, ops, headers)).toMatchObject({
                expirationTime: currentDate + config.authService.refreshTokenLifetime,
                value: expect.any(String),
            })
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Refresh token created')
        })
    })

    describe('method: `refresh`', () => {
        it('should throw UnauthorizedError if token is null', async () => {
            const refreshTokenValue = 'refreshTokenValue'
            const sessionType = SessionType.Acquirer
            const ops = {
                mobileUid: 'mobileUid',
                authEntryPoint: { target: 'target', isBankId: true },
                customLifetime: 1000,
                entityId: 'entityId',
                userIdentifier: 'userIdentifier',
                login: 'login',
            }

            jest.spyOn(refreshTokenModelMock, 'findOne').mockResolvedValueOnce(null)
            const errorMessage = 'Refresh token not found on refresh'

            await expect(async () => {
                await refreshTokenService.refresh(refreshTokenValue, sessionType, ops, headers)
            }).rejects.toEqual(new UnauthorizedError(errorMessage))
            expect(loggerServiceMock.error).toHaveBeenCalledWith(errorMessage, { refreshTokenValue, userIdentifier: ops.userIdentifier })
        })

        it('should return refresh token', async () => {
            const currentDate = Date.now()

            jest.spyOn(Date, 'now').mockImplementation(() => currentDate)

            const refreshTokenValue = 'refreshTokenValue'
            const sessionType = SessionType.Acquirer

            const ops = {
                mobileUid: 'mobileUid',
                authEntryPoint: { target: 'target', isBankId: true },
                entityId: 'entityId',
                userIdentifier: 'userIdentifier',
                login: 'login',
                prolongLifetime: true,
            }
            const refreshToken: GenerateRefreshTokenHelper = new GenerateRefreshTokenHelper(config.authService.refreshTokenLifetime)

            const refreshTokenModel = {
                expirationDate: new Date(refreshToken.expirationTime),
                mobileUid: ops.mobileUid,
                entityId: ops.entityId,
                login: ops.login,
                platformType: headers.platformType,
                platformVersion: headers.platformVersion,
                appVersion: headers.appVersion,
                isDeleted: false,
                authEntryPoint: ops.authEntryPoint,
                authEntryPointHistory: [{ authEntryPoint: ops.authEntryPoint, date: new Date() }],
                value: refreshToken.value,
                expirationTime: refreshToken.expirationTime,
                save: jest.fn(),
            }

            jest.spyOn(refreshTokenModelMock, 'findOne').mockResolvedValueOnce(refreshTokenModel)
            expect(await refreshTokenService.refresh(refreshTokenValue, sessionType, ops, headers)).toMatchObject({
                ...refreshToken,
                value: expect.any(String),
            })
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Refreshing token')
        })
    })

    describe('method: `validate`', () => {
        it('should throw UnauthorizedError if refresh token not found', async () => {
            const refreshTokenValue = 'refreshTokenValue'

            const ops = {
                mobileUid: 'mobileUid',
                authEntryPoint: { target: 'target', isBankId: true },
                customLifetime: 1000,
                entityId: 'entityId',
                userIdentifier: 'userIdentifier',
                login: 'login',
            }

            jest.spyOn(refreshTokenModelMock, 'findOne').mockResolvedValueOnce(null)
            const errorMessage = 'Refresh token not found on validate'

            await expect(async () => {
                await refreshTokenService.validate(refreshTokenValue, headers, ops)
            }).rejects.toEqual(new UnauthorizedError(errorMessage))
            expect(loggerServiceMock.error).toHaveBeenCalledWith('Refresh token not found', {
                refreshTokenValue,
                userIdentifier: ops.userIdentifier,
            })
        })

        it('should throw UnauthorizedError if refresh token expired', async () => {
            const currentDate = new Date()
            const refreshTokenValue = 'refreshTokenValue'

            const ops = {
                mobileUid: 'mobileUid',
                authEntryPoint: { target: 'target', isBankId: true },
                customLifetime: 1000,
                entityId: 'entityId',
                userIdentifier: 'userIdentifier',
                login: 'login',
                useProcessCode: true,
            }

            const refreshToken = {
                mobileUid: ops.mobileUid,
                entityId: ops.entityId,
                userIdentifier: ops.userIdentifier,
                login: ops.login,
                platformType: headers.platformType,
                platformVersion: headers.platformVersion,
                appVersion: headers.appVersion,
                isDeleted: false,
                authEntryPoint: ops.authEntryPoint,
                authEntryPointHistory: [{ authEntryPoint: ops.authEntryPoint, date: new Date() }],
                expirationTime: currentDate.setFullYear(currentDate.getFullYear() - 1),
            }

            jest.spyOn(refreshTokenModelMock, 'findOne').mockResolvedValueOnce(refreshToken)

            await expect(refreshTokenService.validate(refreshTokenValue, headers, ops)).rejects.toEqual(
                new UnauthorizedError('Refresh token is expired', ProcessCode.UserVerificationRequired),
            )
        })
    })

    describe('method: `invalidateTemporaryToken`', () => {
        it('should throw UnauthorizedError if refresh token not found', async () => {
            const refreshTokenValue = 'refreshTokenValue'

            jest.spyOn(refreshTokenModelMock, 'findOne').mockResolvedValueOnce(null)

            await expect(refreshTokenService.invalidateTemporaryToken(refreshTokenValue, headers)).rejects.toEqual(
                new UnauthorizedError('Refresh token not found on validate temp token'),
            )
        })

        it('should throw UnauthorizedError if refresh token expired', async () => {
            const refreshTokenValue = 'refreshTokenValue'

            const refreshToken = {
                expired: true,
            }

            jest.spyOn(refreshTokenModelMock, 'findOne').mockResolvedValueOnce(refreshToken)

            await expect(refreshTokenService.invalidateTemporaryToken(refreshTokenValue, headers)).rejects.toEqual(
                new UnauthorizedError('Refresh token expired'),
            )
        })

        it('should invalidate token', async () => {
            const refreshTokenValue = 'refreshTokenValue'

            const refreshToken = {
                save: jest.fn(),
                expired: false,
            }

            jest.spyOn(refreshTokenModelMock, 'findOne').mockResolvedValueOnce(refreshToken)

            await expect(refreshTokenService.invalidateTemporaryToken(refreshTokenValue, headers)).resolves.toBeUndefined()

            expect(refreshToken.expired).toBeTruthy()
            expect(refreshToken.save).toHaveBeenCalled()
        })
    })

    describe('method: `isTemporaryTokenInvalidate`', () => {
        it('should return true if has invalid temporary token', async () => {
            jest.spyOn(refreshTokenModelMock, 'countDocuments').mockResolvedValueOnce(1)
            expect(await refreshTokenService.isTemporaryTokenInvalidate(headers.mobileUid)).toBeTruthy()
        })

        it('should return false if has no invalid temporary token', async () => {
            jest.spyOn(refreshTokenModelMock, 'countDocuments').mockResolvedValueOnce(0)
            expect(await refreshTokenService.isTemporaryTokenInvalidate(headers.mobileUid)).toBeFalsy()
        })
    })

    describe('method: `logoutUser`', () => {
        it('should throw UnauthorizedError during removing refresh token', async () => {
            const localLoggerServiceMock = mockInstance(DiiaLogger)
            const localRefreshTokenService = new RefreshTokenService(
                config,
                localLoggerServiceMock,
                eventBusMock,
                tokenCacheServiceMock,
                photoIdAuthRequestServiceMock,
                identifierServiceMock,
                tokenExpirationServiceMock,
            )

            const userIdentifier = 'userIdentifier'
            const refreshToken = {
                value: 'value',
                expirationTime: 100,
            }

            jest.spyOn(refreshTokenModelMock, 'updateOne').mockResolvedValueOnce({ modifiedCount: 0 })
            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount: 0 })

            await expect(async () => {
                await localRefreshTokenService.logoutUser(refreshToken, headers.mobileUid, userIdentifier, SessionType.Acquirer)
            }).rejects.toEqual(new UnauthorizedError())
            expect(localLoggerServiceMock.info).toHaveBeenCalledWith('Logging out')
            expect(localLoggerServiceMock.info).toHaveBeenCalledWith('Hard deleted refresh tokens: [0]')
            expect(localLoggerServiceMock.error).toHaveBeenCalledWith(`Can't find refresh token by value and mobile uid`)
        })

        it('should fail to publish event during logout user', async () => {
            const userIdentifier = 'userIdentifier'
            const refreshToken = {
                value: 'value',
                expirationTime: 100,
            }

            jest.spyOn(refreshTokenModelMock, 'updateOne').mockResolvedValueOnce({ modifiedCount: 2 })
            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount: 2 })

            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()
            jest.spyOn(photoIdAuthRequestServiceMock, 'deleteByMobileUid').mockResolvedValueOnce()

            jest.spyOn(eventBusMock, 'publish').mockResolvedValueOnce(false)

            await refreshTokenService.logoutUser(refreshToken, headers.mobileUid, userIdentifier, SessionType.Acquirer)
            expect(loggerServiceMock.fatal).toHaveBeenCalledWith(`Failed to publish event [${InternalEvent.AuthUserLogOut}]`)
        })

        it('should successfully logout user', async () => {
            const localLoggerServiceMock = mockInstance(DiiaLogger)
            const localRefreshTokenService = new RefreshTokenService(
                config,
                localLoggerServiceMock,
                eventBusMock,
                tokenCacheServiceMock,
                photoIdAuthRequestServiceMock,
                identifierServiceMock,
                tokenExpirationServiceMock,
            )

            const userIdentifier = 'userIdentifier'
            const refreshToken = {
                value: 'value',
                expirationTime: 100,
            }

            jest.spyOn(refreshTokenModelMock, 'updateOne').mockResolvedValueOnce({ modifiedCount: 2 })
            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount: 2 })

            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()
            jest.spyOn(photoIdAuthRequestServiceMock, 'deleteByMobileUid').mockResolvedValueOnce()

            jest.spyOn(eventBusMock, 'publish').mockResolvedValueOnce(true)

            await localRefreshTokenService.logoutUser(refreshToken, headers.mobileUid, userIdentifier, SessionType.Acquirer)
            expect(localLoggerServiceMock.fatal).toHaveBeenCalledTimes(0)
        })
    })

    describe('method: `logoutPortalUser`', () => {
        it('should successfully logout user', async () => {
            const userIdentifier = 'userIdentifier'
            const refreshToken = {
                value: 'value',
                expirationTime: 100,
            }

            jest.spyOn(refreshTokenModelMock, 'updateOne').mockResolvedValueOnce({ modifiedCount: 2 })
            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount: 2 })

            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()

            await refreshTokenService.logoutPortalUser(refreshToken, userIdentifier)
            expect(tokenCacheServiceMock.revokeRefreshToken).toHaveBeenCalledWith(
                refreshToken.value,
                tokenExpirationServiceMock.getTokenExpirationInSecondsBySessionType(SessionType.PortalUser),
            )
        })
    })

    describe('method: `serviceEntranceLogout`', () => {
        it('should successfully logout user', async () => {
            const refreshToken = {
                value: 'value',
                expirationTime: 100,
            }

            jest.spyOn(refreshTokenModelMock, 'updateOne').mockResolvedValueOnce({ modifiedCount: 2 })
            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount: 2 })

            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()

            await refreshTokenService.serviceEntranceLogout(refreshToken, headers.mobileUid)
            expect(tokenCacheServiceMock.revokeRefreshToken).toHaveBeenCalledWith(
                refreshToken.value,
                tokenExpirationServiceMock.revocationExpiration(SessionType.ServiceEntrance),
            )
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Logging out')
            expect(loggerServiceMock.info).toHaveBeenCalledWith(`Hard deleted refresh tokens: [2]`)
        })
    })

    describe('method: `checkRefreshTokensExpiration`', () => {
        it('should stop checking expiration if refresh tokens not found', async () => {
            const amountToExpire = 0

            jest.spyOn(refreshTokenModelMock, 'countDocuments').mockResolvedValueOnce(amountToExpire)

            await expect(refreshTokenService.checkRefreshTokensExpiration()).resolves.toBeUndefined()
        })

        it('should stop iterating when tokens', async () => {
            const amountToUnassign = 1

            jest.spyOn(refreshTokenModelMock, 'countDocuments').mockResolvedValueOnce(amountToUnassign)
            jest.spyOn(refreshTokenModelMock, 'find').mockReturnThis()
            jest.spyOn(refreshTokenModelMock, 'limit').mockResolvedValueOnce([])

            await refreshTokenService.checkRefreshTokensExpiration()

            expect(loggerServiceMock.info).toHaveBeenCalledWith(`Successfully expire refresh tokens [${amountToUnassign}]`)
        })

        it('should successfully unassign users from push tokens', async () => {
            const amountToUnassign = 1

            const tokens = [
                {
                    _id: 'id',
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            jest.spyOn(refreshTokenModelMock, 'countDocuments').mockResolvedValueOnce(amountToUnassign)
            jest.spyOn(refreshTokenModelMock, 'find').mockReturnThis()
            jest.spyOn(refreshTokenModelMock, 'limit').mockResolvedValueOnce(tokens)
            jest.spyOn(refreshTokenModelMock, 'updateMany').mockResolvedValueOnce(null)

            await refreshTokenService.checkRefreshTokensExpiration()

            expect(loggerServiceMock.info).toHaveBeenCalledWith(`Successfully expire refresh tokens [${amountToUnassign}]`)
        })
    })

    describe('method: `isExists`', () => {
        it('should return true if refresh token found', async () => {
            jest.spyOn(refreshTokenModelMock, 'countDocuments').mockResolvedValueOnce(1)

            expect(await refreshTokenService.isExists('eisTraceId', headers.mobileUid)).toBeTruthy()
        })

        it('should return false if refresh token not found', async () => {
            jest.spyOn(refreshTokenModelMock, 'countDocuments').mockResolvedValueOnce(0)

            expect(await refreshTokenService.isExists('eisTraceId', headers.mobileUid)).toBeFalsy()
        })
    })

    describe('method: `getTokensByMobileUid`', () => {
        it('should return list of tokens', async () => {
            const tokens = [
                {
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            jest.spyOn(refreshTokenModelMock, 'find').mockResolvedValueOnce(tokens)

            expect(await refreshTokenService.getTokensByMobileUid(headers.mobileUid)).toMatchObject(tokens)
        })
    })

    describe('method: `removeTokensByMobileUid`', () => {
        it('should successfully remove tokens', async () => {
            const deletedCount = 5
            const userIdentifier = 'userIdentifier'
            const sessionType = SessionType.User

            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount })

            await refreshTokenService.removeTokensByMobileUid(headers.mobileUid, userIdentifier, sessionType)
            expect(loggerServiceMock.info).toHaveBeenCalledWith(`Removed refresh tokens by mobile uid: ${deletedCount}`, {
                userIdentifier,
                sessionType,
            })
        })
    })

    describe('method: `removeTokensByUserIdentifier`', () => {
        it('should successfully remove tokens', async () => {
            const userIdentifier = 'userIdentifier'
            const sessionType = SessionType.User
            const deletedCount = 1
            const tokens = [
                {
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            jest.spyOn(refreshTokenModelMock, 'find').mockResolvedValueOnce(tokens)
            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount })
            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()

            expect(await refreshTokenService.removeTokensByUserIdentifier(userIdentifier, sessionType)).toBeFalsy()
            expect(loggerServiceMock.info).toHaveBeenCalledWith(`Removed refresh tokens: ${deletedCount}`)
        })
    })

    describe('method: `removeTokensByLogin`', () => {
        it('should successfully remove tokens', async () => {
            const login = 'login'
            const sessionType = SessionType.User
            const deletedCount = 1
            const tokens = [
                {
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            jest.spyOn(refreshTokenModelMock, 'find').mockResolvedValueOnce(tokens)
            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount })
            jest.spyOn(tokenCacheServiceMock, 'revokeRefreshToken').mockResolvedValueOnce()

            await refreshTokenService.removeTokensByLogin(login, sessionType)
            expect(loggerServiceMock.info).toHaveBeenCalledWith(`Removed refresh tokens: ${deletedCount}`)
        })
    })

    describe('method: `getUserTokensByUserIdentifier`', () => {
        it('should return user tokens', async () => {
            const userIdentifier = 'userIdentifier'
            const sessionType = SessionType.User

            const tokens = [
                {
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            jest.spyOn(identifierServiceMock, 'getSessionTypeFromIdentifier').mockReturnValueOnce(sessionType)
            jest.spyOn(refreshTokenModelMock, 'find').mockReturnValueOnce(tokens)

            expect(await refreshTokenService.getUserTokensByUserIdentifier(userIdentifier)).toMatchObject(tokens)
        })
    })

    describe('method: `getUserTokensByUserIdentifierToDelete`', () => {
        it('should return user tokens', async () => {
            const userIdentifier = 'userIdentifier'
            const sessionType = SessionType.User

            const tokens = [
                {
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            jest.spyOn(identifierServiceMock, 'getSessionTypeFromIdentifier').mockReturnValueOnce(sessionType)
            jest.spyOn(refreshTokenModelMock, 'find').mockReturnValueOnce(tokens)

            expect(await refreshTokenService.getUserTokensByUserIdentifierToDelete(userIdentifier)).toMatchObject(tokens)
        })
    })

    describe('method: `countUserTokensByUserIdentifier`', () => {
        it('should count 5 refresh tokens', async () => {
            const userIdentifier = 'userIdentifier'
            const sessionType = SessionType.User

            jest.spyOn(identifierServiceMock, 'getSessionTypeFromIdentifier').mockReturnValueOnce(sessionType)
            jest.spyOn(refreshTokenModelMock, 'countDocuments').mockReturnValueOnce(5)

            expect(await refreshTokenService.countUserTokensByUserIdentifier(userIdentifier)).toBe(5)
        })
    })

    describe('method: `markAsCompromised`', () => {
        it('should successfully mark refresh token as compromised', async () => {
            const query: FilterQuery<RefreshTokenModel> = { mobileUid: headers.mobileUid }

            jest.spyOn(refreshTokenModelMock, 'updateMany').mockReturnValueOnce(null)

            await refreshTokenService.markAsCompromised(headers.mobileUid)

            expect(refreshTokenModelMock.updateMany).toHaveBeenCalledWith(query, { isCompromised: true })
        })
    })

    describe('method: `removeTokensByEntityId`', () => {
        it('should return refresh tokens', async () => {
            const entityId = 'entityId'
            const deletedCount = 1
            const query: FilterQuery<RefreshTokenModel> = { entityId }

            const tokens = [
                {
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            jest.spyOn(refreshTokenModelMock, 'find').mockReturnValueOnce(tokens)
            jest.spyOn(refreshTokenModelMock, 'deleteMany').mockReturnValueOnce({ deletedCount })

            expect(await refreshTokenService.removeTokensByEntityId(entityId)).toMatchObject(tokens)

            expect(refreshTokenModelMock.find).toHaveBeenCalledWith(query, {
                value: 1,
                sessionType: 1,
            })
            expect(loggerServiceMock.info).toHaveBeenCalledWith(`Removed refresh tokens by entity id: ${deletedCount}`)
        })
    })

    describe('method: `updateActivity`', () => {
        it('should throw ModelNotFoundError if token was not updated', async () => {
            const userIdentifier = 'userIdentifier'

            jest.spyOn(refreshTokenModelMock, 'updateOne').mockReturnValueOnce({ matchedCount: 0 })

            await expect(async () => {
                await refreshTokenService.updateActivity(userIdentifier, headers.mobileUid)
            }).rejects.toEqual(new ModelNotFoundError(refreshTokenModelMock.modelName, headers.mobileUid))
        })

        it('should successfully update activity of a token', async () => {
            const userIdentifier = 'userIdentifier'

            jest.spyOn(refreshTokenModelMock, 'updateOne').mockReturnValueOnce({ matchedCount: 1 })

            expect(await refreshTokenService.updateActivity(userIdentifier, headers.mobileUid)).toBeUndefined()
        })
    })
})
