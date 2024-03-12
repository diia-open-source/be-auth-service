import { SetRequired } from 'type-fest'

import { ActHeaders, AuthEntryPoint, PlatformType } from '@diia-inhouse/types'

export interface RefreshTokenOps {
    prolongLifetime?: boolean
    mobileUid?: string
    authEntryPoint?: AuthEntryPoint
    customLifetime?: number
    entityId?: string
    userIdentifier?: string
    login?: string
}

export interface RefreshTokenValidateOps {
    useProcessCode?: boolean
    userIdentifier?: string
}

export type RefreshTokenHeadersParams = SetRequired<ActHeaders, 'mobileUid' | 'platformType' | 'appVersion'>

export type CreateRefreshTokenHeadersParams = Partial<ActHeaders>

export interface CommonRefreshTokenHeaderParams {
    mobileUid: string
    appVersion?: string
    platformType?: PlatformType
}
