import { randomUUID } from 'crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import GetCabinetToken from '@actions/v1/cabinet/getCabinetToken'

import UserAuthStepsService from '@services/userAuthSteps'
import AuthDataService from '@services/userAuthSteps/authData'
import UserAuthTokenService from '@services/userAuthToken'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStepsModel } from '@interfaces/models/userAuthSteps'
import { AuthUser } from '@interfaces/services/userAuthToken'

describe(`Action ${GetCabinetToken.name}`, () => {
    const testKit = new TestKit()
    const authDataServiceMock = mockInstance(AuthDataService)
    const userAuthTokenServiceMock = mockInstance(UserAuthTokenService)
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const getCabinetTokenAction = new GetCabinetToken(userAuthTokenServiceMock, userAuthStepsServiceMock, authDataServiceMock)

    describe('Method `handler`', () => {
        it('should return token and mobileUid', async () => {
            const headers = testKit.session.getHeaders()

            const args = {
                params: { processId: randomUUID() },
                headers,
            }

            const authCacheData = {
                method: AuthMethod.Nfc,
                requestId: randomUUID(),
                headers,
                sessionType: SessionType.CabinetUser,
            }

            jest.spyOn(userAuthStepsServiceMock, 'completeSteps').mockResolvedValueOnce(<UserAuthStepsModel>{})

            jest.spyOn(authDataServiceMock, 'getAuthorizationCacheData').mockResolvedValueOnce(authCacheData)

            jest.spyOn(userAuthTokenServiceMock, 'getUserToken').mockResolvedValueOnce({
                token: 'test-token',
                identifier: 'identifier',
                tokenData: <AuthUser>{},
            })

            const expectedResult = {
                token: 'test-token',
                mobileUid: headers.mobileUid,
            }

            expect(await getCabinetTokenAction.handler(args)).toEqual(expectedResult)
            expect(userAuthStepsServiceMock.completeSteps).toHaveBeenCalledWith({
                code: AuthSchemaCode.CabinetAuthorization,
                processId: args.params.processId,
                mobileUid: args.headers.mobileUid,
            })
            expect(authDataServiceMock.getAuthorizationCacheData).toHaveBeenCalledWith(
                AuthSchemaCode.CabinetAuthorization,
                args.params.processId,
            )
            expect(userAuthTokenServiceMock.getUserToken).toHaveBeenCalledWith(authCacheData)
        })
    })
})
