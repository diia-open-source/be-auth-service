import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetUserOpenIdDataAction from '@actions/v1/getUserOpenIdData'

import OpenIdService from '@services/openId'

describe(`Action ${GetUserOpenIdDataAction.name}`, () => {
    const testKit = new TestKit()
    const openIdService = mockInstance(OpenIdService)
    const getUserOpenIdDataAction = new GetUserOpenIdDataAction(openIdService)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const args = {
            headers,
            params: { token: 'token' },
        }

        it('should get user OpenId details', async () => {
            const data = {
                userIdentifier: 'string',
                firstName: 'name',
                lastName: 'lastName',
                gender: 'gender',
                birthDay: new Date().toDateString(),
                rnokpp: 'rnokpp',
            }

            jest.spyOn(openIdService, 'getUserOpenIdDetails').mockResolvedValueOnce(data)

            expect(await getUserOpenIdDataAction.handler(args)).toMatchObject(data)
            expect(openIdService.getUserOpenIdDetails).toHaveBeenCalledWith(args.params.token)
        })
    })
})
