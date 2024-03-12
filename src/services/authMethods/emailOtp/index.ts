import { v4 as uuidv4 } from 'uuid'

import { EnvService } from '@diia-inhouse/env'
import { AccessDeniedError, BadRequestError, InternalServerError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import { AuthDocumentType, EResidentApplicant, Logger } from '@diia-inhouse/types'

import Utils from '@src/utils'

import NotificationService from '@services/notification'
import SuperGenService from '@services/superGen'

import { AppConfig } from '@interfaces/config'
import { AuthMethod } from '@interfaces/models/authSchema'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthProviderFactory } from '@interfaces/services/authMethods'
import { VerificationData } from '@interfaces/services/authMethods/emailOtp'

export default class EmailOtpProvider implements AuthProviderFactory {
    constructor(
        private readonly config: AppConfig,
        private readonly cache: CacheService,
        private readonly logger: Logger,
        private readonly envService: EnvService,

        private readonly appUtils: Utils,
        private readonly notificationService: NotificationService,
        private readonly superGenService: SuperGenService,
    ) {}

    private readonly otpLength = this.config.eResident.otpLength

    private readonly otpTtlInSeconds = this.config.eResident.otpTtlInSeconds

    private readonly testOtp = this.config.eResident.testOtp

    private readonly testEmailRegExp = this.config.eResident.testEmailRegExp

    async requestAuthorizationUrl({ email }: AuthUrlOps, { mobileUid }: AuthProviderHeaders): Promise<string> {
        if (!email) {
            throw new BadRequestError(`Param 'email' is required for ${AuthMethod.EmailOtp} auth method`)
        }

        const cacheKey = this.getCacheKey(mobileUid)
        const requestId = uuidv4()
        const otp = this.isTestEmail(email) ? this.testOtp : this.appUtils.generateOtp(this.otpLength)
        const verificationData: VerificationData = { otp, email, requestId }
        const dataToCache = JSON.stringify(verificationData)

        if (!this.isTestEmail(email)) {
            await this.sendOtpViaEmail(email, otp)
        }

        await this.cache.set(cacheKey, dataToCache, this.otpTtlInSeconds)

        return requestId
    }

    async verify(requestId: string, { headers: { mobileUid }, otp }: AuthMethodVerifyParams): Promise<EResidentApplicant> {
        const cacheKey = this.getCacheKey(mobileUid)

        const cachedData = await this.cache.get(cacheKey)

        const { requestId: storedRequestId, email, otp: storedOtp } = this.parseVerificationDataFromCache(cachedData)

        if (requestId !== storedRequestId) {
            this.logger.info(`Verification is failed. Reason: unknown requestId`)
            throw new AccessDeniedError('Unknown requestId')
        }

        if (otp !== storedOtp) {
            this.logger.info(`Verification is failed. Reason: otp mismatch`)
            throw new AccessDeniedError('Otp mismatch')
        }

        await this.cache.remove(cacheKey)

        const user: EResidentApplicant = {
            email,
            document: {
                type: AuthDocumentType.EResidentApplicantEmail,
                value: email,
            },
        }

        return user
    }

    private async sendOtpViaEmail(email: string, otp: string): Promise<void> {
        const emailContent = await this.superGenService.generateEResidentOTPEmail(otp)

        await this.notificationService.sendMail(email, 'Verification code', emailContent)
    }

    private parseVerificationDataFromCache(cachedData: string | null): VerificationData {
        if (!cachedData) {
            this.logger.info(`Parse verification data is failed. Reason: data is expired or missing`)
            throw new BadRequestError('No verification data. Please request authorization url once again')
        }

        try {
            return JSON.parse(cachedData)
        } catch (err) {
            this.logger.error('Unable to parse verification data. Reason: ', { err })
            throw new InternalServerError('Invalid verification data')
        }
    }

    private getCacheKey(mobileUid: string): string {
        return `authSchema.eResidentApplicantOtp.${mobileUid}`
    }

    private isTestEmail(email: string): boolean {
        if (this.envService.isProd()) {
            return false
        }

        return this.testEmailRegExp.test(email)
    }
}
