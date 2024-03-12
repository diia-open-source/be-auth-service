import { PlatformType } from '@diia-inhouse/types'

import CustomRefreshTokenExpiration from '@services/customRefreshTokenExpiration'

import customRefreshTokenExpirationModel from '@models/customRefreshTokenExpiration'

describe(`${CustomRefreshTokenExpiration.name}`, () => {
    let customRefreshTokenExpirationService: CustomRefreshTokenExpiration

    beforeEach(() => {
        customRefreshTokenExpirationService = new CustomRefreshTokenExpiration()
    })

    describe('method: `getByPlatformTypeAndAppVersion`', () => {
        it('should return 1000', async () => {
            const platformType = PlatformType.Android
            const appVersion = '1.0.0'

            const exp = { platformType: PlatformType.Android, appVersion, expiration: 1000 }

            jest.spyOn(customRefreshTokenExpirationModel, 'findOne').mockResolvedValue(exp)

            expect(await customRefreshTokenExpirationService.getByPlatformTypeAndAppVersion(platformType, appVersion)).toBe(1000)
            expect(customRefreshTokenExpirationModel.findOne).toHaveBeenCalledWith({ platformType, appVersion })
            expect(customRefreshTokenExpirationModel.findOne).toHaveBeenCalledTimes(1)
        })

        it('should return undefined', async () => {
            const platformType = PlatformType.Android
            const appVersion = '1.0.0'

            const exp = { platformType: PlatformType.Android, appVersion }

            jest.spyOn(customRefreshTokenExpirationModel, 'findOne').mockResolvedValue(exp)

            expect(await customRefreshTokenExpirationService.getByPlatformTypeAndAppVersion(platformType, appVersion)).toBeUndefined()
            expect(customRefreshTokenExpirationModel.findOne).toHaveBeenCalledWith({ platformType, appVersion })
            expect(customRefreshTokenExpirationModel.findOne).toHaveBeenCalledTimes(1)
        })

        it('should return cached data', async () => {
            const platformType = PlatformType.Android
            const appVersion = '1.0.0'

            const exp = { platformType: PlatformType.Android, appVersion, expiration: 1000 }

            jest.spyOn(customRefreshTokenExpirationModel, 'findOne').mockResolvedValue(exp)

            await customRefreshTokenExpirationService.getByPlatformTypeAndAppVersion(platformType, appVersion)
            await customRefreshTokenExpirationService.getByPlatformTypeAndAppVersion(platformType, appVersion)

            expect(customRefreshTokenExpirationModel.findOne).toHaveBeenCalledWith({ platformType, appVersion })
            expect(customRefreshTokenExpirationModel.findOne).toHaveBeenCalledTimes(1)
        })
    })
})
