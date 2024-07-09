import { compare as compareSemver } from 'compare-versions'

import { Logger, PlatformType } from '@diia-inhouse/types'

import fakeBankLoginSettingsModel from '@models/fakeBankLoginSettings'

import { FakeBankLoginSettings } from '@interfaces/models/fakeBankLoginSettings'

export default class FakeBankLoginService {
    constructor(private readonly logger: Logger) {}

    async getFakeDataToApply(platformType: PlatformType, appVersionParam?: string): Promise<FakeBankLoginSettings | undefined> {
        if (!appVersionParam) {
            return
        }

        const settings = await fakeBankLoginSettingsModel.findOne({ isActive: true }).lean()
        if (!settings) {
            return
        }

        const appVersion = settings.appVersions[platformType]
        if (!appVersion) {
            return
        }

        const isShouldBeApplied = compareSemver(appVersionParam, appVersion, '>=')
        if (!isShouldBeApplied) {
            return
        }

        this.logger.info('Fake bank id login should be applied')

        return settings
    }
}
