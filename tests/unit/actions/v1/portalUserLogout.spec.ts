import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PortalUserSession, PortalUserTokenData, SessionType } from '@diia-inhouse/types'

import PortalUserLogoutAction from '@actions/v1/portalUserLogout'

import RefreshTokenService from '@services/refreshToken'

describe(`Action ${PortalUserLogoutAction.name}`, () => {
    const testKit = new TestKit()
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const portalUserLogoutAction = new PortalUserLogoutAction(refreshTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should successfully logout user', async () => {
            const args = {
                headers,
                session: <PortalUserSession>{
                    sessionType: SessionType.PortalUser,
                    user: <PortalUserTokenData>{
                        refreshToken: { value: 'value', expirationTime: 1000 },
                        identifier: 'identifier',
                    },
                },
            }

            jest.spyOn(refreshTokenServiceMock, 'logoutPortalUser').mockResolvedValueOnce()

            await portalUserLogoutAction.handler(args)

            expect(refreshTokenServiceMock.logoutPortalUser).toHaveBeenCalledWith(
                args.session.user.refreshToken,
                args.session.user.identifier,
            )
        })
    })
})
