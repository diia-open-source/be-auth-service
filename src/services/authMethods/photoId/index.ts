import { BadRequestError } from '@diia-inhouse/errors'

import PhotoIdAuthRequestService from '@services/photoIdAuthRequest'

import { AppConfig } from '@interfaces/config'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthProviderFactory } from '@interfaces/services/authMethods'

export default class PhotoIdProvider implements AuthProviderFactory {
    constructor(
        private readonly config: AppConfig,
        private readonly photoIdAuthRequestService: PhotoIdAuthRequestService,
    ) {}

    private readonly host = this.config.photoId.authUrlHost

    async requestAuthorizationUrl({ userIdentifier }: AuthUrlOps, { mobileUid }: AuthProviderHeaders): Promise<string> {
        if (!userIdentifier) {
            throw new BadRequestError('User identifier is required')
        }

        const { requestId } = await this.photoIdAuthRequestService.createRequest(userIdentifier, mobileUid)

        return this.buildAuthUrl(requestId)
    }

    async verify(requestId: string, { headers: { mobileUid } }: AuthMethodVerifyParams): Promise<void> {
        await this.photoIdAuthRequestService.validateSuccessRequest(requestId, mobileUid)
    }

    private buildAuthUrl(requestId: string): string {
        return `${this.host}/${requestId}`
    }
}
