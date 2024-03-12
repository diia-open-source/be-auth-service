import { PlatformType } from '@diia-inhouse/types'

import customRefreshTokenExpirationModel from '@models/customRefreshTokenExpiration'

export default class CustomRefreshTokenExpiration {
    private readonly cachedExpirationMap: Map<string, number> = new Map()

    async getByPlatformTypeAndAppVersion(platformType: PlatformType, appVersion: string): Promise<number | undefined> {
        const key = `${platformType}_${appVersion}`

        const cachedExpiration = await this.cachedExpirationMap.get(key)
        if (cachedExpiration) {
            return cachedExpiration
        }

        const customExpiration = await customRefreshTokenExpirationModel.findOne({
            platformType,
            appVersion,
        })

        const expiration = customExpiration?.expiration

        if (expiration) {
            this.cachedExpirationMap.set(key, expiration)
        }

        return expiration
    }
}
