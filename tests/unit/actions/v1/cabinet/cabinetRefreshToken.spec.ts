import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { CabinetUserTokenData, SessionType, VerifiedBaseTokenData } from '@diia-inhouse/types'

import CabinetRefreshTokenAction from '@actions/v1/cabinet/cabinetRefreshToken'

import RefreshTokenService from '@services/refreshToken'
import UserAuthTokenService from '@services/userAuthToken'

describe(`Action ${CabinetRefreshTokenAction.name}`, () => {
    const testKit = new TestKit()
    const authServiceMock = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const userAuthTokenServiceMock = mockInstance(UserAuthTokenService)
    const cabinetRefreshTokenAction = new CabinetRefreshTokenAction(authServiceMock, refreshTokenServiceMock, userAuthTokenServiceMock)

    describe('Method `handler`', () => {
        const mockToken = 'mock-token'
        const headers = { ...testKit.session.getHeaders(), token: 'test-token' }

        it('should return token', async () => {
            const mockUserInfo = <VerifiedBaseTokenData<CabinetUserTokenData>>{
                sessionType: SessionType.CabinetUser,
                refreshToken: { value: '<refresh token>' },
                identifier: '<user identifier>',
                exp: 100,
            }

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(refreshTokenServiceMock, 'validate').mockResolvedValueOnce()

            jest.spyOn(userAuthTokenServiceMock, 'refreshUserToken').mockResolvedValueOnce(mockToken)

            expect(await cabinetRefreshTokenAction.handler({ headers })).toMatchObject({
                token: expect.stringContaining(mockToken),
            })
            expect(authServiceMock.validate).toHaveBeenLastCalledWith(headers.token, SessionType.CabinetUser, headers.mobileUid)
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
