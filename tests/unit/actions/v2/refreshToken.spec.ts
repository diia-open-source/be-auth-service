import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType, UserTokenData, VerifiedBaseTokenData } from '@diia-inhouse/types'

import RefreshTokenAction from '@actions/v2/refreshToken'

import RefreshTokenService from '@services/refreshToken'
import UserAuthTokenService from '@services/userAuthToken'

describe(`Action ${RefreshTokenAction.name}`, () => {
    const testKit = new TestKit()
    const authServiceMock = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const userAuthTokenServiceMock = mockInstance(UserAuthTokenService)
    const getAttestationNonceAction = new RefreshTokenAction(authServiceMock, refreshTokenServiceMock, userAuthTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = { ...testKit.session.getHeaders(), token: 'test-token' }

        it('should get token', async () => {
            const mockToken = 'token'
            const mockUserInfo = <VerifiedBaseTokenData<UserTokenData>>{
                sessionType: SessionType.User,
                refreshToken: { value: '<refresh token>' },
                identifier: '<user identifier>',
                exp: 100,
            }

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(refreshTokenServiceMock, 'validate').mockResolvedValueOnce()

            jest.spyOn(userAuthTokenServiceMock, 'refreshUserToken').mockResolvedValueOnce(mockToken)

            expect(await getAttestationNonceAction.handler({ headers })).toMatchObject({
                token: expect.stringContaining(mockToken),
            })
            expect(authServiceMock.validate).toHaveBeenLastCalledWith(headers.token, SessionType.User, headers.mobileUid)
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
