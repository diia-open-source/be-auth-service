import { AuthService } from '@diia-inhouse/crypto'
import { mongo } from '@diia-inhouse/db'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { ServiceEntranceTokenData, SessionType, VerifiedBaseTokenData } from '@diia-inhouse/types'

import ServiceEntranceLogoutAction from '@actions/v1/serviceEntranceLogout'

import RefreshTokenService from '@services/refreshToken'

describe(`Action ${ServiceEntranceLogoutAction.name}`, () => {
    const testKit = new TestKit()
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const authServiceMock = mockInstance(AuthService)
    const serviceEntranceLoginAction = new ServiceEntranceLogoutAction(authServiceMock, refreshTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = { ...testKit.session.getHeaders(), token: 'token' }

        it('should successfully serve entrance logout', async () => {
            const mockValidationData: VerifiedBaseTokenData<ServiceEntranceTokenData> = {
                sessionType: SessionType.ServiceEntrance,
                exp: 1000,
                acquirerId: new mongo.ObjectId(),
                branchHashId: 'string',
                offerHashId: 'string',
                offerRequestHashId: 'string',
                mobileUid: 'string',
                refreshToken: { value: 'asd', expirationTime: 1000 },
            }

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(mockValidationData)

            await serviceEntranceLoginAction.handler({ headers })

            expect(refreshTokenServiceMock.serviceEntranceLogout).toHaveBeenCalledWith(mockValidationData.refreshToken, headers.mobileUid)
        })
    })
})
