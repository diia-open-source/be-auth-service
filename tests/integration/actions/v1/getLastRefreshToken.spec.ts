import { randomUUID } from 'node:crypto'

import TestKit from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import GetLastRefreshTokenAction from '@src/actions/v1/getLastRefreshToken'
import refreshTokenModel from '@src/models/refreshToken'

import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v1/getLastRefreshToken'

describe(`Action ${GetLastRefreshTokenAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let getLastRefreshTokenAction: GetLastRefreshTokenAction
    const testKit = new TestKit()

    beforeAll(async () => {
        app = await getApp()
        getLastRefreshTokenAction = app.container.build(GetLastRefreshTokenAction)
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should return refresh token when existed', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const mobileUid = randomUUID()
        const refreshToken = {
            value: randomUUID(),
            expirationTime: Date.now(),
            sessionType: SessionType.Temporary,
            eisTraceId: randomUUID(),
            mobileUid,
            expirationDate: new Date(),
        }
        const { _id: id, sessionType } = await refreshTokenModel.create(refreshToken)

        // Act
        const result = await getLastRefreshTokenAction.handler({ headers, params: { mobileUid, sessionType } })

        // Assert
        expect(result).toEqual<ActionResult>({
            id: id.toString(),
            value: refreshToken.value,
            expirationTime: refreshToken.expirationTime,
            expirationDate: refreshToken.expirationDate?.toISOString(),
        })
    })
})
