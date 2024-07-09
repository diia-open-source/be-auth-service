import { ObjectId } from '@diia-inhouse/db'

export enum ResourceType {
    Penalty = 'penalty',
    Debt = 'debt',
    SocialAssistance = 'social-assistance',
}

export enum TemplateStub {
    ApplicationId = 'APPLICATION_ID',
    ServiceCenterName = 'SERVICE_CENTER_NAME',
    Reason = 'REASON',
    Address = 'ADDRESS',
    PhoneNumber = 'PHONE_NUMBER',
    FullName = 'FULL_NAME',
    OrderNum = 'ORDER_NUM',
}

export enum MessageTemplateCode {
    NewDeviceConnecting = 'new-device-connecting',
    EResidentNewDeviceConnecting = 'e-resident-new-device-connecting',
    ResidencePermitPermanentAdded = 'residence-permit-permanent-added',
    ResidencePermitTemporaryAdded = 'residence-permit-temporary-added',
    ResidencePermitPermanentNotFound = 'residence-permit-permanent-not-found',
    ResidencePermitTemporaryNotFound = 'residence-permit-temporary-not-found',
}

export type TemplateParams = Partial<Record<TemplateStub, string>>

export interface GetNotificationByResourceTypeResult {
    _id: ObjectId
    hashId: string
    userIdentifier: string
    resourceId?: string
    resourceType?: ResourceType
    isRead: boolean
    isDeleted: boolean
}

export interface CreateNotificationWithPushesParams {
    templateCode: MessageTemplateCode
    userIdentifier: string
    templateParams?: TemplateParams
    resourceId?: string
}

export interface CreateNotificationWithPushesByMobileUidParams extends CreateNotificationWithPushesParams {
    mobileUid: string
}
