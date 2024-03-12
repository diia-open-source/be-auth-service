import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetServiceUserTokenAction from '@actions/v1/serviceUser/getServiceUserToken'

import AuthTokenService from '@services/authToken'

describe(`Action ${GetServiceUserTokenAction.name}`, () => {
    const testKit = new TestKit()
    const authTokenServiceMock = mockInstance(AuthTokenService)
    const getServiceUserTokenAction = new GetServiceUserTokenAction(authTokenServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should return token', async () => {
            const args = {
                params: { login: 'test-login', twoFactorCode: '1234' },
                headers,
            }
            const tokenValue = { token: 'test-token' }

            jest.spyOn(authTokenServiceMock, 'getServiceUserAuthToken').mockResolvedValueOnce(tokenValue.token)

            expect(await getServiceUserTokenAction.handler(args)).toMatchObject(tokenValue)
            expect(authTokenServiceMock.getServiceUserAuthToken).toHaveBeenCalledWith(
                args.params.login,
                undefined,
                args.params.twoFactorCode,
                headers.traceId,
            )
        })

        it('should fail if password and twoFactorCode are provided', async () => {
            const args = {
                params: { login: 'test-login', password: 'psw', twoFactorCode: '1234' },
                headers,
            }

            await expect(async () => {
                await getServiceUserTokenAction.handler(args)
            }).rejects.toEqual(new BadRequestError('Only one of password or twoFactorCode should be provided'))
        })

        it('should fail if password and twoFactorCode are not provided', async () => {
            const args = {
                params: { login: 'test-login' },
                headers,
            }

            await expect(async () => {
                await getServiceUserTokenAction.handler(args)
            }).rejects.toEqual(new BadRequestError('password or twoFactorCode should be provided'))
        })
    })
})
