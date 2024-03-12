import { authenticator } from 'otplib'

import { AccessDeniedError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import EnemyTrackProvider from '@src/providers/enemyTrack/telegramBot'

import UserService from '@services/user'

export default class TwoFactorService {
    constructor(
        private readonly logger: Logger,

        private readonly enemyTrackProvider: EnemyTrackProvider,
        private readonly userService: UserService,
    ) {}

    private readonly issuer = 'Diia Service User'

    async requestServiceUserAuthQrCode(login: string): Promise<void> {
        const secret = await this.getServiceUserSecret(login)
        const keyuri = authenticator.keyuri(login, this.issuer, secret)

        this.logger.info('Authenticator keyuri')

        await this.enemyTrackProvider.sendLink(keyuri)
    }

    async verifyServiceUserCode(secret: string, code: string): Promise<void> {
        const isCodeValid = authenticator.check(code, secret)
        if (!isCodeValid) {
            throw new AccessDeniedError('2FA Code is not valid')
        }
    }

    private async getServiceUserSecret(login: string): Promise<string> {
        const { twoFactorSecret } = await this.userService.getServiceUserByLogin(login)
        if (!twoFactorSecret) {
            throw new AccessDeniedError('2FA is disabled for this user')
        }

        return twoFactorSecret
    }
}
