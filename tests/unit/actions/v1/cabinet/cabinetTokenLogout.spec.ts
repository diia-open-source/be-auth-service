import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { CabinetUserTokenData, SessionType, VerifiedBaseTokenData } from '@diia-inhouse/types'

import CabinetTokenLogoutAction from '@actions/v1/cabinet/cabinetTokenLogout'

import RefreshTokenService from '@services/refreshToken'

describe(`Action ${CabinetTokenLogoutAction.name}`, () => {
    const testKit = new TestKit()
    const authService = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const cabinetTokenLogoutAction = new CabinetTokenLogoutAction(authService, refreshTokenServiceMock)

    describe('Method `handler`', () => {
        it('should successfully logout user', async () => {
            const headers = { ...testKit.session.getHeaders(), token: 'test-token' }

            const mockUserInfo = <VerifiedBaseTokenData<CabinetUserTokenData>>{
                sessionType: SessionType.CabinetUser,
                refreshToken: { value: '<refresh token>' },
                identifier: '<user identifier>',
                exp: 100,
            }

            jest.spyOn(authService, 'validate').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(refreshTokenServiceMock, 'logoutUser').mockResolvedValueOnce()

            await cabinetTokenLogoutAction.handler({ headers })

            expect(authService.validate).toHaveBeenCalledWith(headers.token, SessionType.CabinetUser, headers.mobileUid)
            expect(refreshTokenServiceMock.logoutUser).toHaveBeenCalledWith(
                mockUserInfo.refreshToken,
                headers.mobileUid,
                mockUserInfo.identifier,
                mockUserInfo.sessionType,
            )
        })
    })
})
