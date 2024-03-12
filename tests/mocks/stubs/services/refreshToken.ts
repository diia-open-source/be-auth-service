import { v4 as uuid } from 'uuid'

import { AuthEntryPoint, PlatformType, SessionType } from '@diia-inhouse/types'

import { AuthMethod } from '@interfaces/models/authSchema'
import { RefreshToken, RefreshTokenModel } from '@interfaces/models/refreshToken'

export function getRefreshTokenMock(userIdentifier: string, bankName?: string, data?: Partial<RefreshTokenModel>): RefreshToken {
    const authEntryPoint: AuthEntryPoint = {
        target: AuthMethod.BankId,
        isBankId: true,
        bankName: bankName || uuid(),
    }

    return {
        value: uuid(),
        expirationTime: 1234567890,
        sessionType: SessionType.User,
        eisTraceId: uuid(),
        mobileUid: uuid(),
        platformType: PlatformType.Android,
        platformVersion: '1.0',
        appVersion: '',
        authEntryPoint,
        authEntryPointHistory: [{ authEntryPoint, date: new Date() }],
        userIdentifier,
        isLoadTestPeriod: false,
        expirationDate: new Date(),
        lastActivityDate: new Date(),
        ...data,
    }
}
