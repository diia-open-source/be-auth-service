import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { EResidentTokenData, SessionType, VerifiedBaseTokenData } from '@diia-inhouse/types'

import RefreshEResidentTokenAction from '@actions/v2/eresident/refreshEResidentToken'

import RefreshTokenService from '@services/refreshToken'
import UserAuthTokenService from '@services/userAuthToken'

describe(`Action ${RefreshEResidentTokenAction.name}`, () => {
    const testKit = new TestKit()
    const authServiceMock = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const userAuthTokenServiceMock = mockInstance(UserAuthTokenService)
    const refreshEResidentTokenAction = new RefreshEResidentTokenAction(authServiceMock, refreshTokenServiceMock, userAuthTokenServiceMock)

    describe('Method `handler`', () => {
        const mockToken = 'mock-token'
        const headers = { ...testKit.session.getHeaders(), token: 'test-token' }

        const mockUserInfo = <VerifiedBaseTokenData<EResidentTokenData>>{
            sessionType: SessionType.EResident,
            refreshToken: { value: '<refresh token>' },
            identifier: '<user identifier>',
            exp: 100,
        }

        it('should return token', async () => {
            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(refreshTokenServiceMock, 'validate').mockResolvedValueOnce()

            jest.spyOn(userAuthTokenServiceMock, 'refreshUserToken').mockResolvedValueOnce(mockToken)

            expect(await refreshEResidentTokenAction.handler({ headers })).toMatchObject({
                token: expect.stringContaining(mockToken),
            })
            expect(authServiceMock.validate).toHaveBeenLastCalledWith(headers.token, SessionType.EResident, headers.mobileUid)
            expect(refreshTokenServiceMock.validate).toHaveBeenLastCalledWith(mockUserInfo.refreshToken.value, headers, {
                useProcessCode: true,
                userIdentifier: mockUserInfo.identifier,
            })
            expect(userAuthTokenServiceMock.refreshUserToken).toHaveBeenLastCalledWith(
                mockUserInfo,
                mockUserInfo.refreshToken,
                headers,
                {},
                mockUserInfo.exp,
            )
        })
    })
})
