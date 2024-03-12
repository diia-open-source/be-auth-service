import { MoleculerService } from '@diia-inhouse/diia-app'

import { EventBus, InternalEvent } from '@diia-inhouse/diia-queue'
import { ActionVersion, Logger } from '@diia-inhouse/types'

import {
    CreateNotificationWithPushesByMobileUidParams,
    GetNotificationByResourceTypeResult,
    MessageTemplateCode,
} from '@interfaces/services/notification'

export default class NotificationService {
    constructor(
        private readonly moleculer: MoleculerService,
        private readonly eventBus: EventBus,
        private readonly logger: Logger,
    ) {}

    private readonly serviceName: string = 'Notification'

    async assignUserToPushToken(mobileUid: string, userIdentifier: string): Promise<void> {
        await this.eventBus.publish(InternalEvent.AuthAssignUserToPushToken, { mobileUid, userIdentifier })
    }

    async unassignUsersFromPushTokens(mobileUids: string[]): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'unassignUsersFromPushTokens', actionVersion: ActionVersion.V1 },
            { params: { mobileUids } },
        )
    }

    async createNotificationWithPushes(
        userIdentifier: string,
        templateCode: MessageTemplateCode,
        resourceId: string,
        excludedMobileUids?: string[],
    ): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'createNotificationWithPushes', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier, templateCode, resourceId, excludedMobileUids } },
        )
    }

    async createNotificationWithPushesByMobileUid(
        params: CreateNotificationWithPushesByMobileUidParams,
    ): Promise<GetNotificationByResourceTypeResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'createNotificationWithPushesByMobileUid', actionVersion: ActionVersion.V1 },
            { params },
        )
    }

    async createNotificationWithPushesByMobileUidSafe(
        params: CreateNotificationWithPushesByMobileUidParams,
    ): Promise<GetNotificationByResourceTypeResult | void> {
        try {
            return await this.createNotificationWithPushesByMobileUid(params)
        } catch (err) {
            this.logger.fatal('Failed to exec createNotificationWithPushesByMobileUid', { err, params })
        }
    }

    async sendMail(email: string, subject: string, content: string, attachements = []): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'sendMail',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { email, subject, content, attachements },
            },
        )
    }
}
