import { UnauthorizedError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test/*'

import TestGetToken from '@actions/v1/testGetToken'
import RefreshTokenAction from '@actions/v2/refreshToken'

import refreshTokenModel from '@models/refreshToken'

import { getApp } from '@tests/utils/getApp'

describe(`Action ${RefreshTokenAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>

    let refreshTokenAction: RefreshTokenAction
    let testGetToken: TestGetToken
    let testKit: TestKit

    beforeAll(async () => {
        app = await getApp()
        refreshTokenAction = app.container.build(RefreshTokenAction)
        testGetToken = app.container.build(TestGetToken)
        testKit = app.container.resolve('testKit')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should throw the error when refresh token is expired', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const {
            user: { itn },
        } = testKit.session.getUserSession()
        const { token } = await testGetToken.handler({ headers, params: { requestId: itn } })
        const { mobileUid } = headers

        await refreshTokenModel.updateOne({ mobileUid, isDeleted: false }, { $set: { expirationTime: Date.now() - 1 } })

        // Assert
        await expect(refreshTokenAction.handler({ headers: { ...headers, token } })).rejects.toThrow(UnauthorizedError)
    })
})
