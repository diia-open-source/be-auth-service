import { mockInstance } from '@diia-inhouse/test'

import AuthUpdateBankIdBankListCronTask from '@src/scheduledTasks/authUpdateBankIdBankList'

import BankService from '@services/bank'

describe(`${AuthUpdateBankIdBankListCronTask.name}`, () => {
    const bankServiceMock = mockInstance(BankService)
    const authUpdateBankIdBankListCronTask = new AuthUpdateBankIdBankListCronTask(bankServiceMock)

    describe(`method: ${authUpdateBankIdBankListCronTask.handler.name}`, () => {
        it('should successfully execute update banks list task', async () => {
            jest.spyOn(bankServiceMock, 'updateBanksList').mockResolvedValueOnce()

            expect(await authUpdateBankIdBankListCronTask.handler()).toBeUndefined()
            expect(bankServiceMock.updateBanksList).toHaveBeenCalledWith()
        })
    })
})
