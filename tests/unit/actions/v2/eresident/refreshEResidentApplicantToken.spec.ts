import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { EResidentApplicantTokenData, SessionType, VerifiedBaseTokenData } from '@diia-inhouse/types'

import RefreshEResidentApplicantTokenAction from '@actions/v2/eresident/refreshEResidentApplicantToken'

import RefreshTokenService from '@services/refreshToken'
import UserAuthTokenService from '@services/userAuthToken'

describe(`Action ${RefreshEResidentApplicantTokenAction.name}`, () => {
    const testKit = new TestKit()
    const authServiceMock = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const userAuthTokenServiceMock = mockInstance(UserAuthTokenService)
    const refreshEResidentApplicantTokenAction = new RefreshEResidentApplicantTokenAction(
        authServiceMock,
        refreshTokenServiceMock,
        userAuthTokenServiceMock,
    )

    describe('Method `handler`', () => {
        const mockToken = 'mock-token'
        const headers = { ...testKit.session.getHeaders(), token: 'test-token' }

        const mockUserInfo = <VerifiedBaseTokenData<EResidentApplicantTokenData>>{
            sessionType: SessionType.EResidentApplicant,
            refreshToken: { value: '<refresh token>' },
            identifier: '<user identifier>',
            exp: 100,
        }

        it('should return token', async () => {
            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(mockUserInfo)

            jest.spyOn(refreshTokenServiceMock, 'validate').mockResolvedValueOnce()

            jest.spyOn(userAuthTokenServiceMock, 'refreshUserToken').mockResolvedValueOnce(mockToken)

            expect(await refreshEResidentApplicantTokenAction.handler({ headers })).toMatchObject({
                token: expect.stringContaining(mockToken),
            })
            expect(authServiceMock.validate).toHaveBeenLastCalledWith(headers.token, SessionType.EResidentApplicant, headers.mobileUid)
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
