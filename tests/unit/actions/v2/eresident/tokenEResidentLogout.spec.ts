import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { EResidentTokenData, SessionType, VerifiedBaseTokenData } from '@diia-inhouse/types'

import TokenEResidentLogoutAction from '@actions/v2/eresident/tokenEResidentLogout'

import RefreshTokenService from '@services/refreshToken'

describe(`Action ${TokenEResidentLogoutAction.name}`, () => {
    const testKit = new TestKit()
    const authService = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const tokenEResidentLogoutAction = new TokenEResidentLogoutAction(authService, refreshTokenServiceMock)

    describe('Method `handler`', () => {
        it('should successfully logout user', async () => {
            const headers = { ...testKit.session.getHeaders(), token: 'test-token' }

            const mockUserInfo = <VerifiedBaseTokenData<EResidentTokenData>>{
                sessionType: SessionType.EResident,
                refreshToken: { value: '<refresh token>' },
                identifier: '<user identifier>',
                exp: 100,
            }

            jest.spyOn(authService, 'validate').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(refreshTokenServiceMock, 'logoutUser').mockResolvedValueOnce()

            await tokenEResidentLogoutAction.handler({ headers })

            expect(authService.validate).toHaveBeenCalledWith(
                headers.token,
                [SessionType.EResident, SessionType.EResidentApplicant],
                headers.mobileUid,
            )
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
