import { IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import { I18nService } from '@diia-inhouse/i18n'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PlatformType, SessionType, UserTokenData } from '@diia-inhouse/types'

import BankService from '@services/bank'
import RefreshTokenService from '@services/refreshToken'
import SessionService from '@services/session'
import UserService from '@services/user'

import SessionDataMapper from '@dataMappers/sessionDataMapper'

import { RefreshTokenModel } from '@interfaces/models/refreshToken'
import { ProcessCode } from '@interfaces/services'
import { AuthType } from '@interfaces/services/session'
import { CountHistoryByActionResult } from '@interfaces/services/user'

describe('SessionService', () => {
    const testKit = new TestKit()
    const loggerServiceMock = mockInstance(DiiaLogger)
    const identifierServiceMock = mockInstance(IdentifierService)
    const i18nServiceMock = mockInstance(I18nService)
    const sessionDataMapperMock = mockInstance(SessionDataMapper)

    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const bankServiceMock = mockInstance(BankService)
    const userServiceMock = mockInstance(UserService)

    const headers = testKit.session.getHeaders()
    const userIdentifier = 'userIdentifier'

    const sessionService = new SessionService(
        loggerServiceMock,
        identifierServiceMock,
        refreshTokenServiceMock,
        sessionDataMapperMock,
        bankServiceMock,
        userServiceMock,
    )

    describe('method: `getSessions`', () => {
        it('should return list of sessions with same creation time and status', async () => {
            const currentTime = new Date()
            const tokens = [
                {
                    authEntryPoint: { target: 'target', isBankId: true },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                    isDeleted: false,
                    expired: false,
                    createdAt: currentTime,
                    lastActivityDate: currentTime,
                },
                {
                    authEntryPoint: { target: 'target2', isBankId: true },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.EResident,
                    isDeleted: false,
                    expired: false,
                    createdAt: currentTime,
                    lastActivityDate: currentTime,
                },
                {
                    authEntryPoint: { target: 'target3', isBankId: true },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.Temporary,
                    isDeleted: false,
                    expired: false,
                    createdAt: currentTime,
                },
                {
                    authEntryPoint: { target: 'target4', isBankId: true },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.PortalUser,
                    isDeleted: false,
                    expired: false,
                    createdAt: currentTime,
                },
                {
                    authEntryPoint: { target: 'target5', isBankId: true },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.CabinetUser,
                    isDeleted: false,
                    expired: false,
                    createdAt: currentTime,
                },
            ]

            const mappedSessions = [
                {
                    id: 'id',
                    status: true,
                    platform: {
                        type: headers.platformType,
                        version: headers.appVersion,
                    },
                    appVersion: headers.appVersion,
                    auth: {
                        type: AuthType.BankId,
                        bank: 'bank',
                        creationDate: 'date',
                        lastActivityDate: 'date',
                    },
                },
                {
                    id: 'id2',
                    status: true,
                    platform: {
                        type: headers.platformType,
                        version: headers.appVersion,
                    },
                    appVersion: headers.appVersion,
                    auth: {
                        type: AuthType.BankId,
                        bank: 'bank',
                        creationDate: 'date',
                        lastActivityDate: 'date',
                    },
                },
                {
                    id: 'id3',
                    status: true,
                    platform: {
                        type: headers.platformType,
                        version: headers.appVersion,
                    },
                    appVersion: headers.appVersion,
                    auth: {
                        type: AuthType.BankId,
                        bank: 'bank',
                        creationDate: 'date',
                        lastActivityDate: 'date',
                    },
                },
                {
                    id: 'id4',
                    status: true,
                    platform: {
                        type: headers.platformType,
                        version: headers.appVersion,
                    },
                    appVersion: headers.appVersion,
                    auth: {
                        type: AuthType.BankId,
                        bank: 'bank',
                        creationDate: 'date',
                        lastActivityDate: 'date',
                    },
                },
                {
                    id: 'id5',
                    status: true,
                    platform: {
                        type: headers.platformType,
                        version: headers.appVersion,
                    },
                    appVersion: headers.appVersion,
                    auth: {
                        type: AuthType.BankId,
                        bank: 'bank',
                        creationDate: 'date',
                        lastActivityDate: 'date',
                    },
                },
            ]

            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifier').mockResolvedValueOnce(<RefreshTokenModel[]>tokens)
            jest.spyOn(sessionDataMapperMock, 'getStatus').mockReturnValueOnce(true)
            jest.spyOn(sessionDataMapperMock, 'getStatus').mockReturnValueOnce(true)
            jest.spyOn(sessionDataMapperMock, 'getStatus').mockReturnValueOnce(true)
            jest.spyOn(sessionDataMapperMock, 'getStatus').mockReturnValueOnce(false)
            jest.spyOn(sessionDataMapperMock, 'getStatus').mockReturnValueOnce(false)
            jest.spyOn(sessionDataMapperMock, 'toEntity').mockReturnValueOnce(mappedSessions[0])
            jest.spyOn(sessionDataMapperMock, 'toEntity').mockReturnValueOnce(mappedSessions[1])
            jest.spyOn(sessionDataMapperMock, 'toEntity').mockReturnValueOnce(mappedSessions[2])
            jest.spyOn(sessionDataMapperMock, 'toEntity').mockReturnValueOnce(mappedSessions[3])
            jest.spyOn(sessionDataMapperMock, 'toEntity').mockReturnValueOnce(mappedSessions[4])

            await expect(sessionService.getSessions(userIdentifier)).resolves.toMatchObject(mappedSessions)
        })

        it('should return list of sessions with same status', async () => {
            const tokens = [
                {
                    authEntryPoint: { target: 'target', isBankId: true },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                    isDeleted: false,
                    expired: false,
                },
                {
                    authEntryPoint: { target: 'target2', isBankId: true },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.EResident,
                    isDeleted: false,
                    expired: false,
                },
            ]

            const mappedSessions = [
                {
                    id: 'id',
                    status: true,
                    platform: {
                        type: headers.platformType,
                        version: headers.appVersion,
                    },
                    appVersion: headers.appVersion,
                    auth: {
                        type: AuthType.BankId,
                        bank: 'bank',
                        creationDate: 'date',
                        lastActivityDate: 'date',
                    },
                },
                {
                    id: 'id2',
                    status: true,
                    platform: {
                        type: headers.platformType,
                        version: headers.appVersion,
                    },
                    appVersion: headers.appVersion,
                    auth: {
                        type: AuthType.BankId,
                        bank: 'bank',
                        creationDate: 'date',
                        lastActivityDate: 'date',
                    },
                },
            ]

            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifier').mockResolvedValueOnce(<RefreshTokenModel[]>tokens)
            jest.spyOn(sessionDataMapperMock, 'getStatus').mockReturnValue(true)
            jest.spyOn(sessionDataMapperMock, 'toEntity').mockReturnValueOnce(mappedSessions[0])
            jest.spyOn(sessionDataMapperMock, 'toEntity').mockReturnValueOnce(mappedSessions[1])

            expect(await sessionService.getSessions(userIdentifier)).toMatchObject(mappedSessions)
        })
    })

    describe('method: `getSessionById`', () => {
        it('should return session entity', async () => {
            const tokens = [
                {
                    authEntryPoint: { target: 'target1', isBankId: true, bankName: 'bank' },
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
                {
                    authEntryPoint: { target: 'target2', isBankId: true, bankName: 'bank' },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            const session = {
                status: true,
                platformType: headers.platformType,
                platformVersion: '13',
                appVersion: headers.appVersion,
            }
            const id = headers.mobileUid

            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifier').mockResolvedValueOnce(<RefreshTokenModel[]>tokens)
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(headers.mobileUid)
            jest.spyOn(bankServiceMock, 'getBankName').mockResolvedValueOnce('bank')

            await expect(sessionService.getSessionById(id, userIdentifier)).resolves.toMatchObject(session)
        })
    })

    describe('method: `getUserSessionById`', () => {
        it('should throw NotFoundError if refresh token not found', async () => {
            const id = 'id'
            const userTokenData = {
                sessionType: SessionType.Acquirer,
                identifier: 'identifier',
            }

            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifier').mockResolvedValueOnce([])
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(headers.mobileUid)

            await expect(sessionService.getUserSessionById(<UserTokenData>userTokenData, id)).rejects.toEqual(
                new NotFoundError('Refresh token not found'),
            )
        })

        it('should return session entity with actions', async () => {
            const userTokenData = {
                sessionType: SessionType.Acquirer,
                identifier: 'identifier',
            }
            const actionName = 'actionName'
            const sharingCount = 1
            const signingCount = 1
            const tokens = [
                {
                    authEntryPoint: { target: 'target', isBankId: true, bankName: 'bank' },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            const sessionWithAction = {
                id: 'id',
                status: true,
                platform: {
                    type: headers.platformType,
                    version: headers.appVersion,
                },
                appVersion: headers.appVersion,
                auth: {
                    type: AuthType.BankId,
                    bank: 'bank',
                    creationDate: 'date',
                    lastActivityDate: 'date',
                },
                action: {
                    sharing: {
                        name: actionName,
                        badge: sharingCount,
                    },
                    signing: {
                        name: actionName,
                        badge: signingCount,
                    },
                },
            }

            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifier').mockResolvedValueOnce(<RefreshTokenModel[]>tokens)
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(headers.mobileUid)
            jest.spyOn(bankServiceMock, 'getBankName').mockResolvedValueOnce('bank')
            jest.spyOn(userServiceMock, 'countHistoryByAction').mockResolvedValueOnce({ count: sharingCount })
            jest.spyOn(userServiceMock, 'countHistoryByAction').mockResolvedValueOnce({ count: signingCount })
            jest.spyOn(i18nServiceMock, 'get').mockReturnValueOnce(actionName)
            jest.spyOn(sessionDataMapperMock, 'toEntityWithActions').mockReturnValueOnce(sessionWithAction)

            await expect(sessionService.getUserSessionById(<UserTokenData>userTokenData, headers.mobileUid)).resolves.toMatchObject(
                sessionWithAction,
            )
        })

        it('should return session entity with actions and disabled history by huawei platform type', async () => {
            const userTokenData = {
                sessionType: SessionType.Acquirer,
                identifier: 'identifier',
            }
            const actionName = 'actionName'
            const tokens = [
                {
                    authEntryPoint: { target: 'target', isBankId: true, bankName: 'bank' },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            const sessionWithAction = {
                id: 'id',
                status: true,
                platform: {
                    type: headers.platformType,
                    version: headers.appVersion,
                },
                appVersion: headers.appVersion,
                auth: {
                    type: AuthType.BankId,
                    bank: 'bank',
                    creationDate: 'date',
                    lastActivityDate: 'date',
                },
                action: {
                    sharing: {
                        name: actionName,
                        badge: undefined,
                    },
                    signing: {
                        name: actionName,
                        badge: undefined,
                    },
                },
            }

            const localHeaders = { ...headers }

            localHeaders.platformType = PlatformType.Huawei
            localHeaders.appVersion = '3.0.15'

            const countHistoryByAction = <CountHistoryByActionResult>{
                count: 10,
            }

            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifier').mockResolvedValueOnce(<RefreshTokenModel[]>tokens)
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(localHeaders.mobileUid)
            jest.spyOn(bankServiceMock, 'getBankName').mockResolvedValueOnce('bank')
            jest.spyOn(i18nServiceMock, 'get').mockReturnValueOnce(actionName)

            jest.spyOn(userServiceMock, 'countHistoryByAction').mockResolvedValueOnce(countHistoryByAction)
            jest.spyOn(userServiceMock, 'countHistoryByAction').mockResolvedValueOnce(countHistoryByAction)
            jest.spyOn(sessionDataMapperMock, 'toEntityWithActions').mockReturnValueOnce(sessionWithAction)

            await expect(sessionService.getUserSessionById(<UserTokenData>userTokenData, localHeaders.mobileUid)).resolves.toMatchObject(
                sessionWithAction,
            )
        })

        it('should return session entity with actions and disabled history by ios platform type', async () => {
            const userTokenData = {
                sessionType: SessionType.Acquirer,
                identifier: 'identifier',
            }
            const actionName = 'actionName'
            const tokens = [
                {
                    authEntryPoint: { target: 'target', isBankId: true, bankName: 'bank' },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            const sessionWithAction = {
                id: 'id',
                status: true,
                platform: {
                    type: headers.platformType,
                    version: headers.appVersion,
                },
                appVersion: headers.appVersion,
                auth: {
                    type: AuthType.BankId,
                    bank: 'bank',
                    creationDate: 'date',
                    lastActivityDate: 'date',
                },
                action: {
                    sharing: {
                        name: actionName,
                        badge: undefined,
                    },
                    signing: {
                        name: actionName,
                        badge: undefined,
                    },
                },
            }

            const localHeaders = { ...headers }

            localHeaders.platformType = PlatformType.iOS
            localHeaders.appVersion = '3.0.19'
            const countHistoryByAction = <CountHistoryByActionResult>{
                count: 10,
            }

            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifier').mockResolvedValueOnce(<RefreshTokenModel[]>tokens)
            jest.spyOn(identifierServiceMock, 'createIdentifier').mockReturnValueOnce(localHeaders.mobileUid)
            jest.spyOn(bankServiceMock, 'getBankName').mockResolvedValueOnce('bank')
            jest.spyOn(i18nServiceMock, 'get').mockReturnValueOnce(actionName)
            jest.spyOn(sessionDataMapperMock, 'toEntityWithActions').mockReturnValueOnce(sessionWithAction)
            jest.spyOn(userServiceMock, 'countHistoryByAction').mockResolvedValueOnce(countHistoryByAction)
            jest.spyOn(userServiceMock, 'countHistoryByAction').mockResolvedValueOnce(countHistoryByAction)

            await expect(sessionService.getUserSessionById(<UserTokenData>userTokenData, localHeaders.mobileUid)).resolves.toMatchObject(
                sessionWithAction,
            )
        })
    })

    describe('method: `getDeleteConfirmation`', () => {
        it('should throw BadRequestError if session not found', async () => {
            jest.spyOn(refreshTokenServiceMock, 'countUserTokensByUserIdentifier').mockResolvedValueOnce(0)

            await expect(sessionService.getDeleteConfirmation(userIdentifier)).rejects.toEqual(new BadRequestError('No sessions to delete'))
        })

        it('should return process code if sessions to be deleted found', async () => {
            jest.spyOn(refreshTokenServiceMock, 'countUserTokensByUserIdentifier').mockResolvedValueOnce(1)

            await expect(sessionService.getDeleteConfirmation(userIdentifier)).resolves.toBe(ProcessCode.DeleteUserSessionConfirmation)
        })
    })

    describe('method: `deleteSessions`', () => {
        it('should throw BadRequestError if no sessions to be deleted', async () => {
            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifierToDelete').mockResolvedValueOnce([])

            await expect(sessionService.deleteSessions(userIdentifier)).rejects.toEqual(new BadRequestError('No sessions to delete'))
        })

        it('should successfully delete sessions', async () => {
            const tokens = [
                {
                    authEntryPoint: { target: 'target', isBankId: true, bankName: 'bank' },
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
                {
                    authEntryPoint: { target: 'target', isBankId: true, bankName: 'bank' },
                    mobileUid: headers.mobileUid,
                    platformType: headers.platformType,
                    platformVersion: headers.platformVersion,
                    appVersion: headers.appVersion,
                    sessionType: SessionType.User,
                },
            ]

            jest.spyOn(refreshTokenServiceMock, 'getUserTokensByUserIdentifierToDelete').mockResolvedValueOnce(<RefreshTokenModel[]>tokens)
            jest.spyOn(refreshTokenServiceMock, 'logoutUser').mockResolvedValueOnce()

            await sessionService.deleteSessions(userIdentifier)

            expect(loggerServiceMock.info).toHaveBeenCalledWith('Cannot extract mobileUid from refreshToken while session deleting')
            expect(refreshTokenServiceMock.logoutUser).toHaveBeenCalledTimes(1)
        })
    })
})
