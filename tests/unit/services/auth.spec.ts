import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import AuthService from '@services/auth'
import BankIdAuthMethodService from '@services/authMethods/bankId'
import DsAuthMethodService from '@services/authMethods/ds'
import EmailOtpAuthMethodService from '@services/authMethods/emailOtp'
import EResidentMrzAuthMethodService from '@services/authMethods/eResidentMrz'
import EResidentNfcAuthMethodService from '@services/authMethods/eResidentNfc'
import EResidentQrCodeAuthMethodService from '@services/authMethods/eResidentQrCode'
import MonobankAuthMethodService from '@services/authMethods/monobank'
import NfcAuthMethodService from '@services/authMethods/nfc'
import PhotoIdAuthMethodService from '@services/authMethods/photoId'
import PrivatBankAuthMethodService from '@services/authMethods/privatBank'
import QesAuthMethodService from '@services/authMethods/qes'

import { AuthMethod } from '@interfaces/models/authSchema'
import { AuthMethodVerifyResult, AuthProviderFactory } from '@interfaces/services/authMethods'

describe(`${AuthService.name}`, () => {
    const testKit = new TestKit()

    const mockAuthMethodsBankIdService = mockInstance(BankIdAuthMethodService)

    const mockDsAuthMethodService = mockInstance(DsAuthMethodService)

    const mockEmailOtpAuthMethodService = mockInstance(EmailOtpAuthMethodService)

    const mockEResidentMrzAuthMethodService = mockInstance(EResidentMrzAuthMethodService)

    const mockEResidentNfcAuthMethodService = mockInstance(EResidentNfcAuthMethodService)

    const mockEResidentQrCodeAuthMethodService = mockInstance(EResidentQrCodeAuthMethodService)

    const mockMonobankAuthMethodService = mockInstance(MonobankAuthMethodService)

    const mockNfcAuthMethodService = mockInstance(NfcAuthMethodService)

    const mockPhotoIdAuthMethodService = mockInstance(PhotoIdAuthMethodService)

    const mockPrivatBankAuthMethodService = mockInstance(PrivatBankAuthMethodService)

    const mockQesAuthMethodService = mockInstance(QesAuthMethodService)

    const authService = new AuthService(
        mockAuthMethodsBankIdService,
        mockDsAuthMethodService,
        mockEmailOtpAuthMethodService,
        mockEResidentMrzAuthMethodService,
        mockEResidentNfcAuthMethodService,
        mockEResidentQrCodeAuthMethodService,
        mockMonobankAuthMethodService,
        mockNfcAuthMethodService,
        mockPhotoIdAuthMethodService,
        mockPrivatBankAuthMethodService,
        mockQesAuthMethodService,
    )

    describe('method: `getAuthUrl`', () => {
        const headers = testKit.session.getHeaders()

        it.each([
            [AuthMethod.BankId, mockAuthMethodsBankIdService],
            [AuthMethod.Ds, mockDsAuthMethodService],
            [AuthMethod.EmailOtp, mockEmailOtpAuthMethodService],
            [AuthMethod.EResidentMrz, mockEResidentMrzAuthMethodService],
            [AuthMethod.EResidentNfc, mockEResidentNfcAuthMethodService],
            [AuthMethod.EResidentQrCode, mockEResidentQrCodeAuthMethodService],
            [AuthMethod.Monobank, mockMonobankAuthMethodService],
            [AuthMethod.Nfc, mockNfcAuthMethodService],
            [AuthMethod.PhotoId, mockPhotoIdAuthMethodService],
            [AuthMethod.PrivatBank, mockPrivatBankAuthMethodService],
            [AuthMethod.Qes, mockQesAuthMethodService],
        ])(`should return auth string with %s method for provider`, async (method: AuthMethod, provider: AuthProviderFactory) => {
            const mockValue = 'auth-url'

            jest.spyOn(provider, 'requestAuthorizationUrl').mockResolvedValueOnce(mockValue)

            expect(await authService.getAuthUrl(method, {}, headers)).toBe(mockValue)
        })

        it('should throw error for wrong auth method', async () => {
            const wrongMethod = 'wrong-method'

            await expect(authService.getAuthUrl(<AuthMethod>wrongMethod, {}, headers)).rejects.toThrow(
                new BadRequestError(`Passed authMethod [${wrongMethod}] is not enabled `),
            )
        })
    })

    describe('method: `verify`', () => {
        const headers = testKit.session.getHeaders()

        it.each([
            [AuthMethod.BankId, mockAuthMethodsBankIdService],
            [AuthMethod.Ds, mockDsAuthMethodService],
            [AuthMethod.EmailOtp, mockEmailOtpAuthMethodService],
            [AuthMethod.EResidentMrz, mockEResidentMrzAuthMethodService],
            [AuthMethod.EResidentNfc, mockEResidentNfcAuthMethodService],
            [AuthMethod.EResidentQrCode, mockEResidentQrCodeAuthMethodService],
            [AuthMethod.Monobank, mockMonobankAuthMethodService],
            [AuthMethod.Nfc, mockNfcAuthMethodService],
            [AuthMethod.PhotoId, mockPhotoIdAuthMethodService],
            [AuthMethod.PrivatBank, mockPrivatBankAuthMethodService],
            [AuthMethod.Qes, mockQesAuthMethodService],
        ])(`should return verify result with %s method for provider`, async (method: AuthMethod, provider: AuthProviderFactory) => {
            const mockVerifyResult = <AuthMethodVerifyResult>{}

            jest.spyOn(provider, 'verify').mockResolvedValueOnce(mockVerifyResult)

            expect(await authService.verify(method, 'requestId', { headers })).toBe(mockVerifyResult)
        })

        it('should throw error for wrong auth method', async () => {
            const wrongMethod = 'wrong-method'

            await expect(authService.verify(<AuthMethod>wrongMethod, 'requestId', { headers })).rejects.toThrow(
                new BadRequestError(`Passed authMethod [${wrongMethod}] is not enabled `),
            )
        })
    })
})
