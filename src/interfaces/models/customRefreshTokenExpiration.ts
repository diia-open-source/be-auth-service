import { Document } from 'mongoose'

import { PlatformType } from '@diia-inhouse/types'

export interface CustomRefreshTokenExpiration {
    platformType: PlatformType
    appVersion: string
    expiration: number
}

export interface CustomRefreshTokenExpirationModel extends CustomRefreshTokenExpiration, Document {}
