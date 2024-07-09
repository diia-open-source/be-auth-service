import { randomUUID } from 'node:crypto'

const uuidV4Stub = jest.fn()

jest.mock('uuid', () => ({ v4: uuidV4Stub }))

import DiiaLogger from '@diia-inhouse/diia-logger'
import { EnvService } from '@diia-inhouse/env'
import { AccessDeniedError, BadRequestError, InternalServerError } from '@diia-inhouse/errors'
import { CacheService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { AuthDocumentType } from '@diia-inhouse/types'

import Utils from '@src/utils'

import EmailOtpProvider from '@services/authMethods/emailOtp'
import NotificationService from '@services/notification'
import SuperGenService from '@services/superGen'

import { AppConfig } from '@interfaces/config'
import { AuthMethod } from '@interfaces/models/authSchema'
import { AuthUrlOps } from '@interfaces/services/auth'

describe('EmailOtpProvider', () => {
    const testKit = new TestKit()
    const cacheServiceMock = mockInstance(CacheService)
    const loggerMock = mockInstance(DiiaLogger)
    const envServiceMock = mockInstance(EnvService)
    const appUtilsMock = mockInstance(Utils)
    const notificationServiceMock = mockInstance(NotificationService)
    const superGenServiceMock = mockInstance(SuperGenService)

    const requestId = randomUUID()
    const headers = testKit.session.getHeaders()
    const config = <AppConfig>{
        eResident: {
            otpLength: 4,
            otpTtlInSeconds: 30,
            // eslint-disable-next-line unicorn/better-regex
            testEmailRegExp: /test-eresident-applicant-\{\d+\}@email.c/,
            testOtp: '1111',
        },
    }

    describe('method: requestAuthorizationUrl', () => {
        it('should successfully generate otp and send it on provided email', async () => {
            const options: AuthUrlOps = { email: 'john.doe.email.com' }
            const otp = '1234'
            const emailContentWithOtp = `email-content-with-otp-${otp}`
            const { email } = options
            const {
                eResident: { otpLength, otpTtlInSeconds },
            } = config

            const emailOtpProvider = new EmailOtpProvider(
                config,
                cacheServiceMock,
                loggerMock,
                envServiceMock,
                appUtilsMock,
                notificationServiceMock,
                superGenServiceMock,
            )
            const { mobileUid } = headers

            uuidV4Stub.mockReturnValueOnce(requestId)
            jest.spyOn(envServiceMock, 'isProd').mockReturnValue(true)
            jest.spyOn(appUtilsMock, 'generateOtp').mockReturnValueOnce(otp)
            jest.spyOn(superGenServiceMock, 'generateEResidentOTPEmail').mockResolvedValueOnce(emailContentWithOtp)
            jest.spyOn(notificationServiceMock, 'sendMail').mockResolvedValueOnce()
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await emailOtpProvider.requestAuthorizationUrl(options, headers)).toEqual(requestId)

            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(envServiceMock.isProd).toHaveBeenCalledWith()
            expect(appUtilsMock.generateOtp).toHaveBeenCalledWith(otpLength)
            expect(superGenServiceMock.generateEResidentOTPEmail).toHaveBeenCalledWith(otp)
            expect(notificationServiceMock.sendMail).toHaveBeenCalledWith(email, 'Verification code', emailContentWithOtp)
            expect(cacheServiceMock.set).toHaveBeenCalledWith(
                `authSchema.eResidentApplicantOtp.${mobileUid}`,
                JSON.stringify({ otp, email, requestId }),
                otpTtlInSeconds,
            )
        })

        it('should successfully return test otp and do not send it on provided test email', async () => {
            const options: AuthUrlOps = { email: 'test-eresident-applicant-{1}@email.com' }
            const {
                eResident: { otpTtlInSeconds, testOtp },
            } = config
            const emailContentWithOtp = `email-content-with-otp-${testOtp}`
            const { email } = options

            const emailOtpProvider = new EmailOtpProvider(
                config,
                cacheServiceMock,
                loggerMock,
                envServiceMock,
                appUtilsMock,
                notificationServiceMock,
                superGenServiceMock,
            )
            const { mobileUid } = headers

            uuidV4Stub.mockReturnValueOnce(requestId)
            jest.spyOn(envServiceMock, 'isProd').mockReturnValue(false)
            jest.spyOn(appUtilsMock, 'generateOtp').mockReturnValueOnce(testOtp)
            jest.spyOn(superGenServiceMock, 'generateEResidentOTPEmail').mockResolvedValueOnce(emailContentWithOtp)
            jest.spyOn(notificationServiceMock, 'sendMail').mockResolvedValueOnce()
            jest.spyOn(cacheServiceMock, 'set').mockResolvedValueOnce('OK')

            expect(await emailOtpProvider.requestAuthorizationUrl(options, headers)).toEqual(requestId)

            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(envServiceMock.isProd).toHaveBeenCalledWith()
            expect(cacheServiceMock.set).toHaveBeenCalledWith(
                `authSchema.eResidentApplicantOtp.${mobileUid}`,
                JSON.stringify({ otp: testOtp, email, requestId }),
                otpTtlInSeconds,
            )
        })

        it('should fail with error in case email is not provided', async () => {
            const emailOtpProvider = new EmailOtpProvider(
                config,
                cacheServiceMock,
                loggerMock,
                envServiceMock,
                appUtilsMock,
                notificationServiceMock,
                superGenServiceMock,
            )

            await expect(async () => {
                await emailOtpProvider.requestAuthorizationUrl({}, headers)
            }).rejects.toEqual(new BadRequestError(`Param 'email' is required for ${AuthMethod.EmailOtp} auth method`))
        })
    })

    describe('method: verify', () => {
        const otp = '1234'
        const email = 'john.doe@email.com'
        const emailOtpProvider = new EmailOtpProvider(
            config,
            cacheServiceMock,
            loggerMock,
            envServiceMock,
            appUtilsMock,
            notificationServiceMock,
            superGenServiceMock,
        )

        it('should successfully verify otp', async () => {
            const cachedData = JSON.stringify({ requestId, email, otp })
            const { mobileUid } = headers

            jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(cachedData)
            jest.spyOn(cacheServiceMock, 'remove').mockResolvedValueOnce(1)

            expect(await emailOtpProvider.verify(requestId, { headers, otp })).toEqual({
                email,
                document: {
                    type: AuthDocumentType.EResidentApplicantEmail,
                    value: email,
                },
            })

            expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentApplicantOtp.${mobileUid}`)
            expect(cacheServiceMock.remove).toHaveBeenCalledWith(`authSchema.eResidentApplicantOtp.${mobileUid}`)
        })

        it.each([
            [
                'no cached data',
                requestId,
                otp,
                '',
                new BadRequestError('No verification data. Please request authorization url once again'),
                (): void => {
                    expect(loggerMock.info).toHaveBeenCalledWith(`Parse verification data is failed. Reason: data is expired or missing`)
                },
            ],
            [
                'unable to parse cached data',
                requestId,
                otp,
                'invalid-json-string',
                new InternalServerError('Invalid verification data'),
                (): void => {
                    expect(loggerMock.error).toHaveBeenCalledWith('Unable to parse verification data. Reason: ', { err: expect.any(Error) })
                },
            ],
            [
                'unknown requestId',
                requestId,
                otp,
                JSON.stringify({ requestId: 'other-request-id' }),
                new AccessDeniedError('Unknown requestId'),
                (): void => {
                    expect(loggerMock.info).toHaveBeenCalledWith(`Verification is failed. Reason: unknown requestId`)
                },
            ],
            [
                'otp mismatch',
                requestId,
                otp,
                JSON.stringify({ requestId, otp: 'wrong-otp' }),
                new AccessDeniedError('Otp mismatch'),
                (): void => {
                    expect(loggerMock.info).toHaveBeenCalledWith(`Verification is failed. Reason: otp mismatch`)
                },
            ],
        ])(
            'should fail with error in case %s',
            async (
                _msg,
                inputRequestId: string,
                inputOtp: string,
                inputCachedData: string,
                expectedError: Error,
                checkExpectations: CallableFunction,
            ) => {
                const { mobileUid } = headers

                jest.spyOn(cacheServiceMock, 'get').mockResolvedValueOnce(inputCachedData)

                await expect(async () => {
                    await emailOtpProvider.verify(inputRequestId, { headers, otp: inputOtp })
                }).rejects.toEqual(expectedError)

                checkExpectations()
                expect(cacheServiceMock.get).toHaveBeenCalledWith(`authSchema.eResidentApplicantOtp.${mobileUid}`)
            },
        )
    })
})
