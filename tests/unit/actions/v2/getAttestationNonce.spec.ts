import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { PlatformType } from '@diia-inhouse/types'

import GetAttestationNonceAction from '@actions/v2/getAttestationNonce'

import GoogleIntegrityCheckService from '@services/integrity/googleCheck'
import HuaweiIntegrityCheckService from '@services/integrity/huaweiCheck'

describe(`Action ${GetAttestationNonceAction.name}`, () => {
    const testKit = new TestKit()
    const googleIntegrityCheckServiceMock = mockInstance(GoogleIntegrityCheckService)
    const huaweiIntegrityCheckServiceMock = mockInstance(HuaweiIntegrityCheckService)
    const getAttestationNonceAction = new GetAttestationNonceAction(googleIntegrityCheckServiceMock, huaweiIntegrityCheckServiceMock)

    describe('Method `handler`', () => {
        const session = testKit.session.getUserSession()

        it('should get nonce with Android platform type', async () => {
            const mockNonce = 'android-nonce'

            const headers = { ...testKit.session.getHeaders(), platformType: PlatformType.Android }

            jest.spyOn(googleIntegrityCheckServiceMock, 'createIntegrityChallenge').mockResolvedValueOnce(mockNonce)

            expect(await getAttestationNonceAction.handler({ headers, session })).toMatchObject({ nonce: mockNonce })

            expect(googleIntegrityCheckServiceMock.createIntegrityChallenge).toHaveBeenCalledWith(session.user.identifier, headers)
        })

        it('should get nonce with Huawei platform type', async () => {
            const mockNonce = 'huawei-nonce'

            const headers = { ...testKit.session.getHeaders(), platformType: PlatformType.Huawei }

            jest.spyOn(huaweiIntegrityCheckServiceMock, 'createIntegrityChallenge').mockResolvedValueOnce(mockNonce)

            expect(await getAttestationNonceAction.handler({ headers, session })).toMatchObject({ nonce: mockNonce })

            expect(huaweiIntegrityCheckServiceMock.createIntegrityChallenge).toHaveBeenCalledWith(session.user.identifier, headers)
        })

        it('should throw BadRequestError', async () => {
            const headers = { ...testKit.session.getHeaders(), platformType: PlatformType.iOS }

            await expect(async () => {
                await getAttestationNonceAction.handler({ headers, session })
            }).rejects.toEqual(new BadRequestError(`This operation is not supported for platform ${headers.platformType}`))
        })
    })
})
