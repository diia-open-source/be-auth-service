import { ObjectId } from 'bson'

import { MoleculerService } from '@diia-inhouse/diia-app'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { EventBus, InternalEvent } from '@diia-inhouse/diia-queue'
import { mockInstance } from '@diia-inhouse/test'
import { ActionVersion } from '@diia-inhouse/types'

import NotificationService from '@services/notification'

import { MessageTemplateCode } from '@interfaces/services/notification'

describe(`${NotificationService.name}`, () => {
    const mockDiiaLogger = mockInstance(DiiaLogger)
    const mockEventBusService = mockInstance(EventBus)

    let mockMoleculerService: MoleculerService
    let notificationService: NotificationService

    beforeEach(() => {
        mockMoleculerService = mockInstance(MoleculerService)
        notificationService = new NotificationService(mockMoleculerService, mockEventBusService, mockDiiaLogger)
    })

    describe('method: `assignUserToPushToken`', () => {
        it('should successfully execute method', async () => {
            const mobileUid = 'mobileUid'
            const userIdentifier = 'userIdentifier'

            jest.spyOn(mockEventBusService, 'publish').mockResolvedValueOnce(true)

            expect(await notificationService.assignUserToPushToken(mobileUid, userIdentifier)).toBeUndefined()
            expect(mockEventBusService.publish).toHaveBeenCalledWith(InternalEvent.AuthAssignUserToPushToken, { mobileUid, userIdentifier })
            expect(mockEventBusService.publish).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `unassignUsersFromPushTokens`', () => {
        it('should successfully execute method', async () => {
            const mobileUids = ['value1', 'value2']

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(null)

            expect(await notificationService.unassignUsersFromPushTokens(mobileUids)).toBeNull()
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Notification',
                { name: 'unassignUsersFromPushTokens', actionVersion: ActionVersion.V1 },
                { params: { mobileUids } },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `createNotificationWithPushes`', () => {
        it('should successfully execute method', async () => {
            const userIdentifier = 'userIdentifier'
            const templateCode = MessageTemplateCode.NewDeviceConnecting
            const resourceId = 'resourceId'
            const excludedMobileUids = ['value1', 'value2']

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(null)

            expect(
                await notificationService.createNotificationWithPushes(userIdentifier, templateCode, resourceId, excludedMobileUids),
            ).toBeNull()
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Notification',
                { name: 'createNotificationWithPushes', actionVersion: ActionVersion.V1 },
                { params: { userIdentifier, templateCode, resourceId, excludedMobileUids } },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `createNotificationWithPushesByMobileUid`', () => {
        it('should return notification by resource type result', async () => {
            const params = {
                mobileUid: 'mobileUid',
                templateCode: MessageTemplateCode.EResidentNewDeviceConnecting,
                userIdentifier: 'userIdentifier',
            }

            const result = {
                _id: new ObjectId(),
                hashId: 'hashId',
                userIdentifier: 'userIdentifier',
                isRead: true,
                isDeleted: false,
            }

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(result)

            expect(await notificationService.createNotificationWithPushesByMobileUid(params)).toMatchObject(result)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Notification',
                { name: 'createNotificationWithPushesByMobileUid', actionVersion: ActionVersion.V1 },
                { params },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `createNotificationWithPushesByMobileUidSafe`', () => {
        it('should return notification by resource type result', async () => {
            const params = {
                mobileUid: 'mobileUid',
                templateCode: MessageTemplateCode.EResidentNewDeviceConnecting,
                userIdentifier: 'userIdentifier',
            }

            const result = {
                _id: new ObjectId(),
                hashId: 'hashId',
                userIdentifier: 'userIdentifier',
                isRead: true,
                isDeleted: false,
            }

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(result)

            expect(await notificationService.createNotificationWithPushesByMobileUidSafe(params)).toMatchObject(result)

            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })

        it('should log error after failed request', async () => {
            const params = {
                mobileUid: 'mobileUid',
                templateCode: MessageTemplateCode.EResidentNewDeviceConnecting,
                userIdentifier: 'userIdentifier',
            }

            jest.spyOn(mockMoleculerService, 'act').mockRejectedValueOnce(new Error('request failed'))

            expect(await notificationService.createNotificationWithPushesByMobileUidSafe(params)).toBeUndefined()
            expect(mockDiiaLogger.fatal).toHaveBeenCalledWith('Failed to exec createNotificationWithPushesByMobileUid', {
                err: new Error('request failed'),
                params,
            })
        })
    })

    describe('method: `sendMail`', () => {
        it('should successfully execute method', async () => {
            const params = { email: 'email', subject: 'subject', content: 'content', attachements: [] }

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(null)

            expect(await notificationService.sendMail(params.email, params.subject, params.content, params.attachements)).toBeNull()
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Notification',
                {
                    name: 'sendMail',
                    actionVersion: ActionVersion.V1,
                },
                {
                    params: { email: params.email, subject: params.subject, content: params.content, attachements: params.attachements },
                },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })
})
