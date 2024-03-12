import TestKit, { mockInstance } from '@diia-inhouse/test'
import { SessionType, User } from '@diia-inhouse/types'

import Utils from '@src/utils'

import GetEResidentTokenAction from '@actions/v3/eresident/getEResidentToken'

import UserAuthStepsService from '@services/userAuthSteps'
import AuthDataService from '@services/userAuthSteps/authData'
import UserAuthTokenService from '@services/userAuthToken'

import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStepsModel } from '@interfaces/models/userAuthSteps'
import { AuthUser, UserAuthTokenHeadersParams } from '@interfaces/services/userAuthToken'

describe(`Action ${GetEResidentTokenAction.name}`, () => {
    const testKit = new TestKit()
    const appUtilsMock = mockInstance(Utils)
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const userAuthTokenServiceMock = mockInstance(UserAuthTokenService)
    const authDataServiceMock = mockInstance(AuthDataService)
    const refreshEResidentTokenAction = new GetEResidentTokenAction(
        appUtilsMock,
        userAuthStepsServiceMock,
        userAuthTokenServiceMock,
        authDataServiceMock,
    )

    describe('Method `handler`', () => {
        const args = {
            headers: testKit.session.getHeaders(),
            params: { processId: 'id' },
        }

        it('should return token and channelUuid', async () => {
            const mockChannelUuid = 'channelUuid'
            const mockToken = 'token'
            const mockCodeResponse = <UserAuthStepsModel>{
                code: AuthSchemaCode.EResidentAuth,
            }
            const mockParams = {
                method: AuthMethod.EResidentQrCode,
                requestId: 'requestId',
                headers: <UserAuthTokenHeadersParams>{},
                sessionType: SessionType.EResident,
                bankId: 'bankId',
                user: <User>{},
            }
            const mockIdentifier = 'identifier'

            jest.spyOn(userAuthStepsServiceMock, 'completeSteps').mockResolvedValueOnce(mockCodeResponse)

            jest.spyOn(authDataServiceMock, 'getAuthorizationCacheData').mockResolvedValueOnce(mockParams)

            jest.spyOn(userAuthTokenServiceMock, 'getToken').mockResolvedValueOnce({
                token: mockToken,
                identifier: mockIdentifier,
                tokenData: <AuthUser>{},
            })

            jest.spyOn(appUtilsMock, 'generateChannelUuid').mockResolvedValueOnce(mockChannelUuid)

            expect(await refreshEResidentTokenAction.handler(args)).toMatchObject({
                token: expect.stringContaining(mockToken),
                channelUuid: expect.stringContaining(mockChannelUuid),
            })
            expect(userAuthStepsServiceMock.completeSteps).toHaveBeenLastCalledWith({
                oneOfCodes: [AuthSchemaCode.EResidentFirstAuth, AuthSchemaCode.EResidentAuth, AuthSchemaCode.EResidentApplicantAuth],
                processId: args.params.processId,
                mobileUid: args.headers.mobileUid,
            })
            expect(authDataServiceMock.getAuthorizationCacheData).toHaveBeenLastCalledWith(mockCodeResponse.code, args.params.processId)
            expect(userAuthTokenServiceMock.getToken).toHaveBeenLastCalledWith(mockParams)
            expect(appUtilsMock.generateChannelUuid).toHaveBeenLastCalledWith(mockIdentifier)
        })
    })
})
