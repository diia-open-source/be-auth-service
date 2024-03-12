import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PlatformType } from '@diia-inhouse/types'

import ValidateAttestationAction from '@actions/v2/validateAttestation'

import GoogleIntegrityCheckService from '@services/integrity/googleCheck'
import HuaweiIntegrityCheckService from '@services/integrity/huaweiCheck'

describe(`Action ${ValidateAttestationAction.name}`, () => {
    const testKit = new TestKit()
    const integrityGoogleCheckServiceMock = mockInstance(GoogleIntegrityCheckService)
    const integrityHuaweiCheckServiceMock = mockInstance(HuaweiIntegrityCheckService)
    const validateAttestationAction = new ValidateAttestationAction(integrityGoogleCheckServiceMock, integrityHuaweiCheckServiceMock)

    describe('Method `handler`', () => {
        const session = testKit.session.getUserSession()

        it('should get nonce with Android platform type', async () => {
            const headers = { ...testKit.session.getHeaders(), platformType: PlatformType.Android }
            const args = {
                headers,
                session,
                params: { signedAttestationStatement: 'statement', nonce: 'nonce' },
            }

            jest.spyOn(integrityGoogleCheckServiceMock, 'launchIntegrityChallenge').mockResolvedValueOnce()

            expect(await validateAttestationAction.handler(args)).toMatchObject({ success: true })

            expect(integrityGoogleCheckServiceMock.launchIntegrityChallenge).toHaveBeenCalledWith(
                session.user.identifier,
                headers.mobileUid,
                args.params.signedAttestationStatement,
            )
        })

        it('should get nonce with Huawei platform type', async () => {
            const headers = { ...testKit.session.getHeaders(), platformType: PlatformType.Huawei }
            const args = {
                headers,
                session,
                params: { signedAttestationStatement: 'statement', nonce: 'nonce' },
            }

            jest.spyOn(integrityHuaweiCheckServiceMock, 'launchIntegrityChallenge').mockResolvedValueOnce()

            expect(await validateAttestationAction.handler(args)).toMatchObject({ success: true })

            expect(integrityHuaweiCheckServiceMock.launchIntegrityChallenge).toHaveBeenCalledWith(
                session.user.identifier,
                headers.mobileUid,
                args.params.signedAttestationStatement,
            )
        })

        it('should throw BadRequestError', async () => {
            const headers = { ...testKit.session.getHeaders(), platformType: PlatformType.iOS }
            const args = {
                headers,
                session,
                params: { signedAttestationStatement: 'statement', nonce: 'nonce' },
            }

            await expect(async () => {
                await validateAttestationAction.handler(args)
            }).rejects.toEqual(new BadRequestError(`This operation is not supported for platform ${headers.platformType}`))
        })
    })
})
