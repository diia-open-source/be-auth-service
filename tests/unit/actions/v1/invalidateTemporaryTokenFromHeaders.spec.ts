import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType, TemporaryTokenData, UserSession, VerifiedBaseTokenData } from '@diia-inhouse/types'

import InvalidateTemporaryTokenFromHeadersAction from '@actions/v1/invalidateTemporaryTokenFromHeaders'

import RefreshTokenService from '@services/refreshToken'

describe(`Action ${InvalidateTemporaryTokenFromHeadersAction.name}`, () => {
    const testKit = new TestKit()
    const authServiceMock = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const invalidateTemporaryTokenFromHeadersAction = new InvalidateTemporaryTokenFromHeadersAction(
        authServiceMock,
        refreshTokenServiceMock,
    )

    describe('Method `handler`', () => {
        const mockTicket = 'mock'
        const headers = { ...testKit.session.getHeaders(), ticket: mockTicket }
        const args = {
            headers,
            session: <UserSession>{
                user: {
                    identifier: 'ident',
                },
            },
        }

        it('should get invalidate temporary token info', async () => {
            const temporaryToken: VerifiedBaseTokenData<TemporaryTokenData> = {
                sessionType: SessionType.Temporary,
                refreshToken: { value: '<refresh token>', expirationTime: 1000 },
                exp: 100,
                mobileUid: 'test-id',
            }

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(temporaryToken)

            jest.spyOn(refreshTokenServiceMock, 'validate').mockResolvedValueOnce()

            jest.spyOn(refreshTokenServiceMock, 'invalidateTemporaryToken').mockResolvedValueOnce()

            expect(await invalidateTemporaryTokenFromHeadersAction.handler(args)).toMatchObject({
                sessionId: temporaryToken.mobileUid,
                status: 'ok',
            })
            expect(authServiceMock.validate).toHaveBeenCalledWith(args.headers.ticket, SessionType.Temporary)
            expect(refreshTokenServiceMock.validate).toHaveBeenCalledWith(temporaryToken.refreshToken.value, {
                mobileUid: temporaryToken.mobileUid,
            })
            expect(refreshTokenServiceMock.invalidateTemporaryToken).toHaveBeenCalledWith(temporaryToken.refreshToken.value, {
                mobileUid: temporaryToken.mobileUid,
            })
        })
    })
})
