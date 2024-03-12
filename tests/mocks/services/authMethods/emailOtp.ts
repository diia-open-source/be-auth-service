import { CacheService } from '@diia-inhouse/redis'

import { AuthMockProvider, GetUserDataParams } from '@tests/interfaces/mocks/services/authMethods'

export default class EmailOtpMock implements AuthMockProvider {
    constructor(private readonly cache: CacheService) {}

    private readonly otp: string = '123456'

    private readonly mobileUid: string = '309333aa-7e31-4ed3-a4df-5247245808c6'

    private readonly email: string = 'test-eresident-applicant-{1}@email.c'

    async requestAuthorizationUrl(): Promise<void> {
        const cacheKey = `authSchema.eResidentApplicantOtp.${this.mobileUid}`

        await this.cache.remove(cacheKey)
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    async getUserData(_params: GetUserDataParams = {}): Promise<void> {}

    getSpecificParams(): Record<string, string> {
        return { otp: this.otp, mobileUid: this.mobileUid, email: this.email }
    }
}
