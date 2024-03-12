import TestKit, { mockInstance } from '@diia-inhouse/test'
import { UserSession } from '@diia-inhouse/types'

import CreateBankIdAuthUrlAction from '@actions/v1/createBankIdAuthUrl'

import AuthService from '@services/auth'

import { AuthMethod } from '@interfaces/models/authSchema'

describe(`Action ${CreateBankIdAuthUrlAction.name}`, () => {
    const testKit = new TestKit()
    const authService = mockInstance(AuthService)
    const createBankIdAuthUrlAction = new CreateBankIdAuthUrlAction(authService)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should return authUrl', async () => {
            const authUrl = 'authUrl'

            const args = { headers, params: { bankId: 'id' }, session: <UserSession>{} }

            jest.spyOn(authService, 'getAuthUrl').mockResolvedValueOnce(authUrl)

            expect(await createBankIdAuthUrlAction.handler(args)).toMatchObject({ authUrl })
            expect(authService.getAuthUrl).toHaveBeenCalledWith(AuthMethod.BankId, { bankId: args.params.bankId }, args.headers)
        })
    })
})
