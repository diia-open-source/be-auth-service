import { AuthService } from '@diia-inhouse/crypto'
import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { AuthDocumentType, Gender, SessionType, UserTokenData, VerifiedBaseTokenData } from '@diia-inhouse/types'

import ProlongSessionAction from '@actions/v1/prolongSession'

import UserAuthStepsService from '@services/userAuthSteps'
import UserAuthTokenService from '@services/userAuthToken'

import { AuthSchemaCode } from '@interfaces/models/authSchema'
import { UserAuthStepsModel } from '@interfaces/models/userAuthSteps'

describe(`Action ${ProlongSessionAction.name}`, () => {
    const authServiceMock = mockInstance(AuthService)
    const testKit = new TestKit()
    const userAuthTokenService = mockInstance(UserAuthTokenService)
    const userAuthStepsServiceMock = mockInstance(UserAuthStepsService)
    const prolongSessionAction = new ProlongSessionAction(userAuthStepsServiceMock, authServiceMock, userAuthTokenService)

    describe('Method `handler`', () => {
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        const mockValidationData: VerifiedBaseTokenData<UserTokenData> = {
            sessionType: SessionType.User,
            exp: 1000,
            mobileUid: 'string',
            identifier: 'string',
            authEntryPoint: {
                target: 'string',
                isBankId: false,
            },
            fName: 'string',
            lName: 'string',
            mName: 'string',
            itn: 'string',
            gender: Gender.male,
            phoneNumber: 'string',
            email: 'string',
            passport: 'string',
            document: { type: AuthDocumentType.IdCard, value: 'value' },
            birthDay: 'string',
            addressOfRegistration: 'string',
            addressOfBirth: 'string',
            refreshToken: { value: 'token', expirationTime: 1000 },
        }

        it('should throw BadRequestError if authToken is not provided', async () => {
            const args = {
                headers: { ...headers, token: undefined },
                session,
                params: { processId: 'id' },
            }

            await expect(async () => {
                await prolongSessionAction.handler(args)
            }).rejects.toEqual(new BadRequestError('Authorization header is not present'))
        })

        it('should get token', async () => {
            const args = {
                headers: { ...headers, token: 'token' },
                session,
                params: { processId: 'id' },
            }

            const mockToken = 'mockToken'

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(mockValidationData)

            jest.spyOn(userAuthStepsServiceMock, 'completeSteps').mockResolvedValueOnce(<UserAuthStepsModel>{})

            jest.spyOn(userAuthTokenService, 'prolongSession').mockResolvedValueOnce(mockToken)

            expect(await prolongSessionAction.handler(args)).toMatchObject({ token: mockToken })
            expect(authServiceMock.validate).toHaveBeenCalledWith(
                args.headers.token,
                mockValidationData.sessionType,
                args.headers.mobileUid,
            )
            expect(userAuthStepsServiceMock.completeSteps).toHaveBeenCalledWith({
                code: AuthSchemaCode.Prolong,
                processId: args.params.processId,
                mobileUid: args.headers.mobileUid,
                userIdentifier: args.session.user.identifier,
            })
            expect(userAuthTokenService.prolongSession).toHaveBeenCalledWith(
                args.session.user,
                args.headers,
                args.params.processId,
                mockValidationData.sessionType,
                mockValidationData.exp,
            )
        })
    })
})
