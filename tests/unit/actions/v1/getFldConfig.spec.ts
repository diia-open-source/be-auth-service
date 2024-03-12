import TestKit, { mockInstance } from '@diia-inhouse/test'
import { UserSession } from '@diia-inhouse/types'

import GetFldConfigAction from '@actions/v1/getFldConfig'

import AuthSchemaService from '@services/authSchema'

import { AuthSchemaCode, AuthSchemaModel } from '@interfaces/models/authSchema'
import { FaceLivenessDetectionVersion } from '@interfaces/services/authSchema'

describe(`Action ${GetFldConfigAction.name}`, () => {
    const testKit = new TestKit()
    const authSchemaServiceMock = mockInstance(AuthSchemaService)
    const getFldConfigAction = new GetFldConfigAction(authSchemaServiceMock)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()

        it('should get face liveness detection version', async () => {
            const args = {
                params: { isLowRamDevice: true, builtInTrueDepthCamera: true },
                headers,
                session: <UserSession>{},
            }

            const mockResponse = { version: FaceLivenessDetectionVersion.V1 }
            const getByCodeResponse = <AuthSchemaModel>{}

            jest.spyOn(authSchemaServiceMock, 'getByCode').mockResolvedValueOnce(getByCodeResponse)

            jest.spyOn(authSchemaServiceMock, 'getFldConfig').mockResolvedValueOnce(mockResponse)

            expect(await getFldConfigAction.handler(args)).toMatchObject({
                fld: mockResponse,
            })
            expect(authSchemaServiceMock.getByCode).toHaveBeenCalledWith(AuthSchemaCode.Authorization)
            expect(authSchemaServiceMock.getFldConfig).toHaveBeenCalledWith(
                getByCodeResponse,
                args.headers,
                args.params.isLowRamDevice,
                args.params.builtInTrueDepthCamera,
            )
        })
    })
})
