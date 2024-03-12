import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { CabinetUserTokenData, ServiceUserSession, SessionType, VerifiedBaseTokenData } from '@diia-inhouse/types'

import RefreshServiceUserTokenAction from '@actions/v1/serviceUser/refreshServiceUserToken'

import UserAuthTokenService from '@services/userAuthToken'

describe(`Action ${RefreshServiceUserTokenAction.name}`, () => {
    const testKit = new TestKit()
    const authService = mockInstance(AuthService)
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const refreshServiceUserTokenAction = new RefreshServiceUserTokenAction(authService, userAuthTokenService)

    describe('Method `handler`', () => {
        it('should return token', async () => {
            const headers = { ...testKit.session.getHeaders(), token: 'test-token' }

            const args = { headers, session: <ServiceUserSession>{} }

            const mockUserInfo = <VerifiedBaseTokenData<CabinetUserTokenData>>{
                sessionType: SessionType.CabinetUser,
                refreshToken: { value: '<refresh token>' },
                identifier: '<user identifier>',
                exp: 100,
            }

            jest.spyOn(authService, 'validate').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(userAuthTokenService, 'refreshServiceUserToken').mockResolvedValueOnce('token')

            expect(await refreshServiceUserTokenAction.handler(args)).toMatchObject({ token: 'token' })
            expect(authService.validate).toHaveBeenCalledWith(args.headers.token, SessionType.ServiceUser)
            expect(userAuthTokenService.refreshServiceUserToken).toHaveBeenCalledWith(
                mockUserInfo,
                mockUserInfo.refreshToken,
                mockUserInfo.exp,
            )
        })
    })
})
