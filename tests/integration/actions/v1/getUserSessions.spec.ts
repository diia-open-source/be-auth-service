import { v4 as uuid } from 'uuid'

import TestKit from '@diia-inhouse/test'
import { PlatformType } from '@diia-inhouse/types'

import GetUserSessionsAction from '@src/actions/v1/getUserSessions'

import BankService from '@services/bank'

import refreshTokenModel from '@models/refreshToken'

import { getRefreshTokenMock } from '@tests/mocks/stubs/services/refreshToken'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v1/getUserSessions'
import { RefreshToken } from '@interfaces/models/refreshToken'
import { AuthType } from '@interfaces/services/session'

describe(`Action ${GetUserSessionsAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let getUserSessionsAction: GetUserSessionsAction
    let testKit: TestKit
    let bankService: BankService

    beforeAll(async () => {
        app = await getApp()
        getUserSessionsAction = app.container.build(GetUserSessionsAction)
        testKit = app.container.resolve('testKit')
        bankService = app.container.resolve<BankService>('bankService')
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should return sessions ordered by activity date', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        const { identifier: userIdentifier } = session.user

        const today = new Date()
        const dayAgo = new Date(today.getDate() - 1)
        const twoDaysAgo = new Date(today.getDate() - 2)

        const bankNameFirst = 'bank1' + uuid()
        const bankNameSecond = 'bank2' + uuid()
        const bankNameLast = 'bank3' + uuid()

        const [tokenDayAgo, tokenToday, tokenLast]: RefreshToken[] = [
            getRefreshTokenMock(userIdentifier, bankNameSecond, { createdAt: today, lastActivityDate: dayAgo }),
            getRefreshTokenMock(userIdentifier, bankNameFirst, { createdAt: dayAgo, lastActivityDate: today }),
            getRefreshTokenMock(userIdentifier, bankNameLast, { createdAt: today, lastActivityDate: twoDaysAgo }),
        ]

        await refreshTokenModel.insertMany([tokenDayAgo, tokenToday, tokenLast])

        jest.spyOn(bankService, 'getBankName').mockImplementation(async (bankName) => bankName)

        // Act
        const result = await getUserSessionsAction.handler({ session, headers, params: {} })

        // Assert
        const bankNames = result.sessions.map(({ auth }) => auth.bank)

        expect(bankNames).toEqual([bankNameFirst, bankNameSecond, bankNameLast])
        expect(result).toEqual<ActionResult>({
            sessions: expect.arrayContaining([
                {
                    id: expect.any(String),
                    status: true,
                    platform: {
                        type: PlatformType.Android,
                        version: '1.0',
                    },
                    appVersion: expect.any(String),
                    auth: {
                        type: AuthType.BankId,
                        bank: bankNameFirst,
                        creationDate: expect.any(String),
                        lastActivityDate: expect.any(String),
                    },
                },
            ]),
        })
    })
})
