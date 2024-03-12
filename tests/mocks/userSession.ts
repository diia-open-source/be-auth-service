import { v4 as uuid } from 'uuid'

import { IdentifierService } from '@diia-inhouse/crypto'
import {
    ActionVersion,
    AppUserActionHeaders,
    AuthDocumentType,
    AuthEntryPoint,
    Gender,
    PlatformType,
    SessionType,
    UserSession,
    UserTokenData,
} from '@diia-inhouse/types'

import { generateItn } from './randomData'

export default class UserSessionGenerator {
    constructor(private readonly identifier: IdentifierService) {}

    getAuthEntryPoint(): AuthEntryPoint {
        return {
            target: 'bankid',
            isBankId: true,
            bankName: 'diia bank',
            document: AuthDocumentType.ForeignPassport,
        }
    }

    getUserSession(user: Partial<UserTokenData> = {}): UserSession {
        const itn: string = generateItn()
        const result: UserTokenData = {
            fName: 'Дія',
            lName: 'Надія',
            mName: 'Володимирівна',
            itn,
            gender: Gender.female,
            phoneNumber: '+380999999999',
            email: 'test@test.com',
            mobileUid: uuid(),
            passport: '12345',
            document: { type: AuthDocumentType.ForeignPassport, value: '12345' },
            birthDay: '24.08.1991',
            addressOfRegistration: '',
            addressOfBirth: '',
            sessionType: SessionType.User,
            identifier: this.identifier.createIdentifier(itn),
            authEntryPoint: this.getAuthEntryPoint(),
            refreshToken: {
                value: uuid(),
                expirationTime: Date.now() + 300000,
            },
            ...user,
        }

        return { sessionType: user.sessionType || SessionType.User, user: result }
    }

    getHeaders(headers: Partial<AppUserActionHeaders> = {}): AppUserActionHeaders {
        const platformType = PlatformType.Android
        const appVersion = '1991.8.24'

        return {
            mobileUid: uuid(),
            traceId: uuid(),
            token: uuid(),
            platformVersion: '',
            platformType,
            appVersion,
            actionVersion: ActionVersion.V3,
            ...headers,
        }
    }
}
