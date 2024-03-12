import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetBanksAction from '@actions/v1/getBanks'

import BankService from '@services/bank'

describe(`Action ${GetBanksAction.name}`, () => {
    const testKit = new TestKit()
    const bankServiceMock = mockInstance(BankService)
    const getBanksAction = new GetBanksAction(bankServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should get array of banks', async () => {
            const banks = [
                {
                    name: 'bank-name',
                    logoUrl: 'logo-url',
                    workable: true,
                    bankId: 'bank-id',
                    memberId: 'member-id',
                    sortOrder: 1,
                    id: 'bank-id',
                },
            ]

            jest.spyOn(bankServiceMock, 'getBanks').mockResolvedValueOnce(banks)

            expect(await getBanksAction.handler({ headers })).toMatchObject({ banks })
            expect(bankServiceMock.getBanks).toHaveBeenCalledWith(headers)
        })
    })
})
