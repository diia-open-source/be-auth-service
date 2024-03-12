import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType, TemporaryTokenData, UserSession, VerifiedBaseTokenData } from '@diia-inhouse/types'

import InvalidateTemporaryTokenAction from '@actions/v1/invalidateTemporaryToken'

import RefreshTokenService from '@services/refreshToken'

describe(`Action ${InvalidateTemporaryTokenAction.name}`, () => {
    const testKit = new TestKit()
    const authServiceMock = mockInstance(AuthService)
    const refreshTokenServiceMock = mockInstance(RefreshTokenService)
    const invalidateTemporaryTokenAction = new InvalidateTemporaryTokenAction(authServiceMock, refreshTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const args = {
            headers,
            params: { ticket: 'token' },
            session: <UserSession>{
                user: {
                    identifier: 'identifier',
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

            expect(await invalidateTemporaryTokenAction.handler(args)).toMatchObject({
                sessionId: temporaryToken.mobileUid,
                status: 'ok',
            })
            expect(authServiceMock.validate).toHaveBeenCalledWith(args.params.ticket, SessionType.Temporary)
            expect(refreshTokenServiceMock.validate).toHaveBeenCalledWith(temporaryToken.refreshToken.value, {
                mobileUid: temporaryToken.mobileUid,
            })
            expect(refreshTokenServiceMock.invalidateTemporaryToken).toHaveBeenCalledWith(temporaryToken.refreshToken.value, {
                mobileUid: temporaryToken.mobileUid,
            })
        })
    })
})
