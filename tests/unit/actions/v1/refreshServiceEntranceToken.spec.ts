import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { ServiceEntranceTokenData, SessionType, VerifiedBaseTokenData } from '@diia-inhouse/types'

import RefreshServiceEntranceTokenAction from '@actions/v1/refreshServiceEntranceToken'

import RefreshTokenService from '@services/refreshToken'
import UserAuthTokenService from '@services/userAuthToken'

describe(`Action ${RefreshServiceEntranceTokenAction.name}`, () => {
    const testKit = new TestKit()
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const authServiceMock = mockInstance(AuthService)
    const refreshServiceEntranceTokenAction = new RefreshServiceEntranceTokenAction(
        authServiceMock,
        refreshTokenServiceMock,
        userAuthTokenService,
    )

    describe('Method `handler`', () => {
        const headers = { ...testKit.session.getHeaders(), token: 'token' }
        const session = testKit.session.getUserSession()

        it('should get token', async () => {
            const args = { headers, session }

            const mockValidationData: VerifiedBaseTokenData<ServiceEntranceTokenData> = {
                sessionType: SessionType.ServiceEntrance,
                exp: 1000,
                acquirerId: Object('acquirerId'),
                branchHashId: 'string',
                offerHashId: 'string',
                offerRequestHashId: 'string',
                mobileUid: 'string',
                refreshToken: { value: 'token', expirationTime: 1000 },
            }

            const mockToken = 'mockToken'

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(mockValidationData)

            jest.spyOn(refreshTokenServiceMock, 'validate').mockResolvedValueOnce()

            jest.spyOn(userAuthTokenService, 'refreshServiceEntranceToken').mockResolvedValueOnce(mockToken)

            expect(await refreshServiceEntranceTokenAction.handler(args)).toMatchObject({ token: mockToken })
            expect(authServiceMock.validate).toHaveBeenCalledWith(args.headers.token, SessionType.ServiceEntrance, args.headers.mobileUid)
            expect(refreshTokenServiceMock.validate).toHaveBeenCalledWith(mockValidationData.refreshToken.value, args.headers)
            expect(userAuthTokenService.refreshServiceEntranceToken).toHaveBeenCalledWith(
                mockValidationData,
                mockValidationData.refreshToken,
                mockValidationData.exp,
            )
        })
    })
})
