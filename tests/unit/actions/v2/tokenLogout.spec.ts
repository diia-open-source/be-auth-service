import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType, UserTokenData, VerifiedBaseTokenData } from '@diia-inhouse/types'

import TokenLogoutAction from '@actions/v2/tokenLogout'

import RefreshTokenService from '@services/refreshToken'

describe(`Action ${TokenLogoutAction.name}`, () => {
    const testKit = new TestKit()
    const authService = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const tokenEResidentLogoutAction = new TokenLogoutAction(authService, refreshTokenServiceMock)

    describe('Method `handler`', () => {
        it('should successfully logout user', async () => {
            const headers = { ...testKit.session.getHeaders(), token: 'test-token' }

            const mockUserInfo = <VerifiedBaseTokenData<UserTokenData>>{
                sessionType: SessionType.User,
                refreshToken: { value: '<refresh token>' },
                identifier: '<user identifier>',
                exp: 100,
            }

            jest.spyOn(authService, 'validate').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(refreshTokenServiceMock, 'logoutUser').mockResolvedValueOnce()

            await tokenEResidentLogoutAction.handler({ headers })

            expect(authService.validate).toHaveBeenCalledWith(headers.token, SessionType.User, headers.mobileUid)
            expect(refreshTokenServiceMock.logoutUser).toHaveBeenCalledWith(
                mockUserInfo.refreshToken,
                headers.mobileUid,
                mockUserInfo.identifier,
                mockUserInfo.sessionType,
                mockUserInfo.exp,
            )
        })
    })
})
