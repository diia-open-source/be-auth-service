import TestKit, { mockInstance } from '@diia-inhouse/test'

import ValidateAttestationAction from '@actions/v1/validateAttestation'

import AttestationService from '@services/integrity/attestation'

describe(`Action ${ValidateAttestationAction.name}`, () => {
    const testKit = new TestKit()
    const attestationServiceMock = mockInstance(AttestationService)
    const validateAttestationAction = new ValidateAttestationAction(attestationServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()
        const args = {
            headers,
            session,
            params: {
                nonce: 'nonce',
                signedAttestationStatement: 'statement',
            },
        }

        it('should get success true', async () => {
            jest.spyOn(attestationServiceMock, 'launchIntegrityChallenge').mockResolvedValueOnce()

            expect(await validateAttestationAction.handler(args)).toMatchObject({ success: true })
            expect(attestationServiceMock.launchIntegrityChallenge).toHaveBeenCalledWith(
                args.session.user.identifier,
                args.headers.mobileUid,
                args.params.signedAttestationStatement,
                args.params.nonce,
            )
        })
    })
})
