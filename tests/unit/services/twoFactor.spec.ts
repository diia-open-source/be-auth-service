import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError } from '@diia-inhouse/errors'
import { mockInstance } from '@diia-inhouse/test'

import EnemyTrackProvider from '@src/providers/enemyTrack/telegramBot'

import TwoFactorService from '@services/twoFactor'
import UserService from '@services/user'

import { ServiceUser } from '@interfaces/services/user'

jest.mock('otplib', () => {
    const original = jest.requireActual('otplib')

    return {
        ...original,
        authenticator: { keyuri: (): string => 'test', check: (): boolean => false },
    }
})

describe(`${TwoFactorService.name}`, () => {
    const loggerServiceMock = mockInstance(DiiaLogger)
    const enemyTrackProviderMock = mockInstance(EnemyTrackProvider)
    const userServiceMock = mockInstance(UserService)

    const twoFactorService = new TwoFactorService(loggerServiceMock, enemyTrackProviderMock, userServiceMock)
    const login = 'login'

    describe('method: `requestServiceUserAuthQrCode`', () => {
        it('should throw AccessDeniedError if two factor secret not found', async () => {
            jest.spyOn(userServiceMock, 'getServiceUserByLogin').mockResolvedValueOnce(<ServiceUser>{})

            await expect(async () => {
                await twoFactorService.requestServiceUserAuthQrCode(login)
            }).rejects.toEqual(new AccessDeniedError('2FA is disabled for this user'))
        })

        it('should successfully request qr code', async () => {
            jest.spyOn(userServiceMock, 'getServiceUserByLogin').mockResolvedValueOnce(<ServiceUser>{ twoFactorSecret: 'secret' })
            jest.spyOn(enemyTrackProviderMock, 'sendLink').mockResolvedValueOnce()

            await twoFactorService.requestServiceUserAuthQrCode(login)
            expect(loggerServiceMock.info).toHaveBeenCalledWith('Authenticator keyuri')
        })
    })

    describe('method: `verifyServiceUserCode`', () => {
        it('should throw AccessDeniedError if code not valid', async () => {
            const secret = 'secret'
            const code = 'code'

            await expect(async () => {
                await twoFactorService.verifyServiceUserCode(secret, code)
            }).rejects.toEqual(new AccessDeniedError('2FA Code is not valid'))
        })
    })
})
