import { MoleculerService } from '@diia-inhouse/diia-app'

import { mongo } from '@diia-inhouse/db'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { EventBus } from '@diia-inhouse/diia-queue'
import { mockInstance } from '@diia-inhouse/test'
import { ActionVersion } from '@diia-inhouse/types'

import NotificationService from '@services/notification'

import { InternalEvent } from '@interfaces/application'
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

            const eventBusPublishSpy = jest.spyOn(mockEventBusService, 'publish').mockResolvedValueOnce(true)

            expect(await notificationService.assignUserToPushToken(mobileUid, userIdentifier)).toBeUndefined()
            expect(eventBusPublishSpy).toHaveBeenCalledWith(InternalEvent.AuthAssignUserToPushToken, { mobileUid, userIdentifier })
            expect(eventBusPublishSpy).toHaveBeenCalledTimes(1)

            eventBusPublishSpy.mockRestore()
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
                _id: new mongo.ObjectId(),
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
                _id: new mongo.ObjectId(),
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
