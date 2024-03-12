import DiiaLogger from '@diia-inhouse/diia-logger'
import { mockInstance } from '@diia-inhouse/test'
import { PlatformType } from '@diia-inhouse/types'

const fakeModelMock = {
    isActive: true,
    bank: <Bank>{},
    authorizationUrl: 'url',
    requestId: 'requestId',
    bankIdUser: <BankIdUser>{},
    appVersions: { [PlatformType.iOS]: '2.0.0' },
}
const fakeBankLoginSettingsMock = {
    findOne: (): FakeBankLoginSettings => <FakeBankLoginSettings>(<unknown>{
            lean: (): FakeBankLoginSettings => fakeModelMock,
        }),
}

jest.mock('@models/fakeBankLoginSettings', () => ({
    __esModule: true,
    default: fakeBankLoginSettingsMock,
}))

import FakeBankLoginService from '@services/fakeBankLogin'

import { FakeBankLoginSettings } from '@interfaces/models/fakeBankLoginSettings'
import { BankIdUser } from '@interfaces/services/authMethods/bankId'
import { Bank } from '@interfaces/services/bank'

describe(`${FakeBankLoginService.name}`, () => {
    const mockLogger = mockInstance(DiiaLogger)
    const fakeBankLoginService = new FakeBankLoginService(mockLogger)

    describe('method: `getFakeDataToApply`', () => {
        it('should return undefined if appVersionParam not provided', async () => {
            expect(await fakeBankLoginService.getFakeDataToApply(PlatformType.Android, undefined)).toBeUndefined()
        })

        it('should return undefined if settings model not found', async () => {
            jest.spyOn(fakeBankLoginSettingsMock, 'findOne').mockReturnValueOnce(<FakeBankLoginSettings>(<unknown>{
                lean: (): unknown => undefined,
            }))

            expect(await fakeBankLoginService.getFakeDataToApply(PlatformType.iOS, '1.0.0')).toBeUndefined()
        })

        it('should return undefined if given app version is not appropriate', async () => {
            expect(await fakeBankLoginService.getFakeDataToApply(PlatformType.Android, '1.0.0')).toBeUndefined()
        })

        it('should return undefined if isShouldBeApplied is false', async () => {
            expect(await fakeBankLoginService.getFakeDataToApply(PlatformType.iOS, '1.0.0')).toBeUndefined()
        })

        it('should return settings', async () => {
            expect(await fakeBankLoginService.getFakeDataToApply(PlatformType.iOS, '2.0.0')).toMatchObject(fakeModelMock)
            expect(mockLogger.info).toHaveBeenCalledWith('Fake bank id login should be applied')
        })
    })
})
