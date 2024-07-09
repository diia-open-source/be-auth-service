import { MoleculerService } from '@diia-inhouse/diia-app'

import { EventBus } from '@diia-inhouse/diia-queue'
import { ActionVersion, Logger } from '@diia-inhouse/types'

import { InternalEvent } from '@interfaces/application'
import { CreateNotificationWithPushesByMobileUidParams, GetNotificationByResourceTypeResult } from '@interfaces/services/notification'

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
