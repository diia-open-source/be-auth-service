import { randomUUID as uuid } from 'node:crypto'

import { AnalyticsActionResult, AnalyticsService } from '@diia-inhouse/analytics'
import { AccessDeniedError, BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import { DocumentTypeCamelCase, Logger, UserTokenData } from '@diia-inhouse/types'
import { phoneticChecker } from '@diia-inhouse/utils'

import NfcService from '@services/nfc'

import { AppConfig } from '@interfaces/config'
import { AnalyticsActionType, AnalyticsCategory, ProcessCode } from '@interfaces/services'
import { AuthMethodVerifyParams } from '@interfaces/services/auth'
import { AuthProviderFactory } from '@interfaces/services/authMethods'
import { NfcUserDTO } from '@interfaces/services/authMethods/nfc'

export default class NfcProvider implements AuthProviderFactory {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly nfcService: NfcService,
        private readonly analytics: AnalyticsService,
    ) {}

    private readonly host = this.config.nfc.authUrlHost

    async requestAuthorizationUrl(): Promise<string> {
        const requestId = uuid()

        // todo persist this requestId ti reuse in authNfcSaveScanResult.ts

        this.logger.info('Created authorization url for nfc', { requestId })

        return this.buildAuthUrl(requestId)
    }

    async verify(_requestId: string, { headers: { mobileUid }, user }: AuthMethodVerifyParams): Promise<NfcUserDTO> {
        const isUserPhotoVerified = await this.nfcService.isUserPhotoVerified(mobileUid)
        if (!isUserPhotoVerified) {
            this.logger.error('User photo is not verified')

            throw new AccessDeniedError()
        }

        const userData = await this.nfcService.getUserDataFromCache(mobileUid)
        if (!userData || !Object.keys(userData).length) {
            throw new NotFoundError('User data not found')
        }

        await this.validateUserData(userData, user)

        return userData
    }

    private async validateUserData(userData: NfcUserDTO, user?: UserTokenData): Promise<void> {
        const { docType, itn, docNumber, birthDay: birthDayByNfc, gender } = userData
        const isPassport = [DocumentTypeCamelCase.idCard, DocumentTypeCamelCase.foreignPassport].includes(docType)

        if ((isPassport && !itn) || !docNumber || !birthDayByNfc || !gender) {
            throw new BadRequestError('Invalid user data', { userData })
        }

        if (!user) {
            return
        }

        const { fName, lName, birthDay } = user
        const { firstName: fNameByNfc, lastName: lNameByNfc } = userData

        if (birthDayByNfc !== birthDay) {
            this.logger.error('BirthDays are not equal')

            throw new AccessDeniedError('Auth error', {}, ProcessCode.ResidencePermitInvalidData)
        }

        const fNameEquality = phoneticChecker.getEqualityCoefficient(fNameByNfc, fName)
        const lNameEquality = phoneticChecker.getEqualityCoefficient(lNameByNfc, lName)

        const analyticsData = {
            etalonNameLength: fNameByNfc.length,
            slaveNameLength: fName.length,
            etalonLastNameLength: lNameByNfc.length,
            slaveLastNameLength: lName.length,
            nameEquality: fNameEquality,
            lastNameEquality: lNameEquality,
            strictNameEquality: fNameByNfc.toUpperCase() === fName.toUpperCase(),
            strictLastNameEquality: lNameByNfc.toUpperCase() === lName.toUpperCase(),
        }

        const isFullNameEqual = [fNameEquality, lNameEquality].every((equality) => equality >= this.config.nfc.phoneticEqualityThreshold)

        if (!isFullNameEqual) {
            this.logger.error('PhoneticChecker dost not satisfied')
            this.analytics.log(
                AnalyticsCategory.ResidencePermitNfcAdding,
                AnalyticsActionType.MetaphoneCheck,
                AnalyticsActionResult.Error,
                analyticsData,
            )

            throw new AccessDeniedError('Auth error', {}, ProcessCode.ResidencePermitInvalidData)
        }

        this.analytics.log(
            AnalyticsCategory.ResidencePermitNfcAdding,
            AnalyticsActionType.MetaphoneCheck,
            AnalyticsActionResult.Success,
            analyticsData,
        )
    }

    private buildAuthUrl(requestId: string): string {
        return `${this.host}/${requestId}`
    }
}
