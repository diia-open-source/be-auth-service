import TestKit, { mockInstance } from '@diia-inhouse/test'

import VerifyAuthMethodAction from '@actions/v1/verifyAuthMethod'

import UserAuthStepsService from '@services/userAuthSteps'

import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'

describe(`Action ${VerifyAuthMethodAction.name}`, () => {
    const testKit = new TestKit()
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const verifyAuthMethodAction = new VerifyAuthMethodAction(userAuthStepsServiceMock)

    const headers = testKit.session.getHeaders()
    const session = testKit.session.getUserSession()
    const args = {
        headers,
        session,
        params: {
            method: AuthMethod.Nfc,
            requestId: 'requestId',
            processId: 'processId',
            qrCodePayload: { token: 'token' },
            mrzPayload: { docNumber: 'docNumber', residenceCountry: 'residenceCountry' },
            qesPayload: { signature: 'signature' },
            otp: 'otp',
            bankId: 'bankId',
        },
    }

    describe('Method `handler`', () => {
        it('should get process code', async () => {
            const mockProcessCode = ProcessCode.AuthNfcSuccess

            jest.spyOn(userAuthStepsServiceMock, 'verifyAuthMethod').mockResolvedValueOnce(mockProcessCode)

            expect(await verifyAuthMethodAction.handler(args)).toMatchObject({ processCode: mockProcessCode })
            expect(userAuthStepsServiceMock.verifyAuthMethod).toHaveBeenCalledWith(
                args.params.method,
                args.params.requestId,
                args.session?.user,
                args.headers,
                args.params.processId,
                {
                    headers: args.headers,
                    bankId: args.params.bankId,
                    qrCodePayload: args.params.qrCodePayload,
                    mrzPayload: args.params.mrzPayload,
                    qesPayload: args.params.qesPayload,
                    otp: args.params.otp,
                },
            )
        })
    })

    describe('Method `getLockResource`', () => {
        it('should return string with mobileUid info', () => {
            expect(verifyAuthMethodAction.getLockResource(args)).toBe(`user-auth-steps-${args.headers.mobileUid}`)
        })
    })
})
