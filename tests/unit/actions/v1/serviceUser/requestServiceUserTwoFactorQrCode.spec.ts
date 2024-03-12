import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit from '@diia-inhouse/test'
import { ServiceUserSession } from '@diia-inhouse/types'

import RequestServiceUserTwoFactorQrCodeAction from '@actions/v1/serviceUser/requestServiceUserTwoFactorQrCode'

import TwoFactorService from '@services/twoFactor'
import UserService from '@services/user'

import EnemyTrackTelegramBotService from '@providers/enemyTrack/telegramBot'

describe(`Action ${RequestServiceUserTwoFactorQrCodeAction.name}`, () => {
    const testKit = new TestKit()
    const twoFactorService = new TwoFactorService(<DiiaLogger>{}, <EnemyTrackTelegramBotService>{}, <UserService>{})
    const requestServiceUserTwoFactorQrCodeAction = new RequestServiceUserTwoFactorQrCodeAction(twoFactorService)

    describe('Method `handler`', () => {
        it('should return success true', async () => {
            const headers = { ...testKit.session.getHeaders() }

            const args = { headers, params: { login: 'test-login' }, session: <ServiceUserSession>{} }

            jest.spyOn(twoFactorService, 'requestServiceUserAuthQrCode').mockResolvedValueOnce()

            expect(await requestServiceUserTwoFactorQrCodeAction.handler(args)).toMatchObject({ success: true })
            expect(twoFactorService.requestServiceUserAuthQrCode).toHaveBeenCalledWith(args.params.login)
        })
    })
})
