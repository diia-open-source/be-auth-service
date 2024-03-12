import { randomUUID } from 'crypto'

const uuidV4Stub = jest.fn()

jest.mock('uuid', () => ({ v4: uuidV4Stub }))

import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError, ServiceUnavailableError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpService } from '@diia-inhouse/http'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import BankIdProvider from '@services/authMethods/bankId'
import BankService from '@services/bank'
import BankIdAuthRequestService from '@services/bankIdAuthRequest'
import FakeBankLoginService from '@services/fakeBankLogin'

import { bankIdCryptoServiceClient } from '@tests/mocks/grpc/clients'

import { AppConfig } from '@interfaces/config'
import { AuthMethod } from '@interfaces/models/authSchema'
import { FakeBankLoginSettings } from '@interfaces/models/fakeBankLoginSettings'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { GenderAsSex } from '@interfaces/services/authMethods'
import { BankIdDocumentType, BankIdUser } from '@interfaces/services/authMethods/bankId'
import { BankIdDataset, BankIdVersion } from '@interfaces/services/bank'

describe('BankIdProvider', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const httpServiceMock = mockInstance(HttpService)
    const bankServiceMock = mockInstance(BankService)
    const bankIdAuthRequestServiceMock = mockInstance(BankIdAuthRequestService)
    const fakeBankLoginServiceMock = mockInstance(FakeBankLoginService)

    describe('method: requestAuthorizationUrl', () => {
        const state = randomUUID()
        const clientId = randomUUID()
        const host = 'bankid.gov.ua'
        const authPath = '/auth'
        const bankId = 'bankid'
        const datasetInUse: BankIdDataset = BankIdDataset.DATASET_11
        const headers: AuthProviderHeaders = testKit.session.getHeaders()

        it.each([
            [BankIdVersion.V1, `https://${host}${authPath}?response_type=code&client_id=${clientId}&state=${state}&bank_id=${bankId}`],
            [
                BankIdVersion.V2,
                `https://${host}${authPath}?response_type=code&client_id=${clientId}&state=${state}&bank_id=${bankId}&dataset=${datasetInUse}`,
            ],
        ])(
            'should successfully return authorization url for bankId version %s',
            async (bankIdVersion: BankIdVersion, expectedAuthUrl: string) => {
                const options: AuthUrlOps = {
                    bankId,
                }
                const config = <AppConfig>{
                    bankId: {
                        clientId,
                        host,
                        authPath,
                        bankIdVersion,
                        datasetInUse,
                    },
                }
                const { platformType, appVersion, mobileUid } = headers
                const bankIdProvider = new BankIdProvider(
                    config,
                    loggerMock,
                    httpServiceMock,
                    bankServiceMock,
                    bankIdAuthRequestServiceMock,
                    fakeBankLoginServiceMock,
                    bankIdCryptoServiceClient,
                )

                jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                jest.spyOn(bankServiceMock, 'isBankWorkable').mockResolvedValueOnce(true)
                jest.spyOn(bankIdAuthRequestServiceMock, 'createRequest').mockResolvedValueOnce()
                uuidV4Stub.mockReturnValueOnce(state)

                expect(await bankIdProvider.requestAuthorizationUrl(options, headers)).toEqual(expectedAuthUrl)

                expect(fakeBankLoginServiceMock.getFakeDataToApply).toHaveBeenCalledWith(platformType, appVersion)
                expect(bankServiceMock.isBankWorkable).toHaveBeenCalledWith(bankId)
                expect(bankIdAuthRequestServiceMock.createRequest).toHaveBeenCalledWith(mobileUid, bankId)
                expect(uuidV4Stub).toHaveBeenCalledWith()
            },
        )

        it('should successfully return fake authorization url', async () => {
            const options: AuthUrlOps = {
                bankId,
            }
            const config = <AppConfig>{}
            const bankIdProvider = new BankIdProvider(
                config,
                loggerMock,
                httpServiceMock,
                bankServiceMock,
                bankIdAuthRequestServiceMock,
                fakeBankLoginServiceMock,
                bankIdCryptoServiceClient,
            )
            const fakeData: FakeBankLoginSettings = <FakeBankLoginSettings>{
                authorizationUrl: 'https://fake.bankid.ua',
            }
            const { platformType, appVersion, mobileUid } = headers

            jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(fakeData)
            jest.spyOn(bankIdAuthRequestServiceMock, 'createRequest').mockResolvedValueOnce()

            expect(await bankIdProvider.requestAuthorizationUrl(options, headers)).toEqual(fakeData.authorizationUrl)

            expect(fakeBankLoginServiceMock.getFakeDataToApply).toHaveBeenCalledWith(platformType, appVersion)
            expect(bankIdAuthRequestServiceMock.createRequest).toHaveBeenCalledWith(mobileUid, bankId)
        })

        it.each([
            [
                'bankId was not provided',
                {},
                BankIdVersion.V1,
                new BadRequestError(`BankId is required field for ${AuthMethod.BankId} auth method`),
                (): void => {},
            ],
            [
                'provided bankId is not workable',
                { bankId },
                BankIdVersion.V1,
                new BadRequestError(`Provided bankId ${bankId} is not workable`),
                (): void => {
                    jest.spyOn(bankServiceMock, 'isBankWorkable').mockResolvedValueOnce(false)
                },
            ],
            [
                'bankId version is unhandled',
                { bankId },
                <BankIdVersion>'v3',
                new TypeError('Unhandled bank id version type: v3'),
                (): void => {
                    jest.spyOn(bankServiceMock, 'isBankWorkable').mockResolvedValueOnce(true)
                },
            ],
        ])(
            'should fail with error in case %s',
            async (
                _msg: string,
                options: AuthUrlOps,
                bankIdVersion: BankIdVersion,
                expectedError: Error,
                defineSpecificSpies: CallableFunction,
            ) => {
                const config = <AppConfig>{
                    bankId: {
                        clientId,
                        host,
                        authPath,
                        bankIdVersion,
                        datasetInUse,
                    },
                }
                const bankIdProvider = new BankIdProvider(
                    config,
                    loggerMock,
                    httpServiceMock,
                    bankServiceMock,
                    bankIdAuthRequestServiceMock,
                    fakeBankLoginServiceMock,
                    bankIdCryptoServiceClient,
                )

                jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                defineSpecificSpies()
                jest.spyOn(bankIdAuthRequestServiceMock, 'createRequest').mockResolvedValueOnce()
                uuidV4Stub.mockReturnValueOnce(state)

                await expect(async () => {
                    await bankIdProvider.requestAuthorizationUrl(options, headers)
                }).rejects.toEqual(expectedError)
            },
        )
    })

    describe('method: verify', () => {
        const requestId = randomUUID()
        const clientId = randomUUID()
        const clientSecret = randomUUID()
        const host = 'bankid.gov.ua'
        const authPath = '/auth'
        const tokenPath = '/token'
        const userPath = '/user'
        const bankId = 'bankname'
        const headers = testKit.session.getHeaders()
        const cert = 'some-certificate'

        const { user } = testKit.session.getUserSession()
        const bankIdUser: BankIdUser = {
            addresses: [],
            birthDay: user.birthDay,
            documents: [],
            email: user.email,
            firstName: user.fName,
            inn: user.itn,
            lastName: user.lName,
            middleName: user.mName,
            phone: user.phoneNumber,
            sex: GenderAsSex.M,
            type: 'type',
        }

        it.each([
            [
                BankIdVersion.V1,
                JSON.stringify({
                    type: 'physical',
                    cert,
                    fields: ['firstName', 'middleName', 'lastName', 'phone', 'inn', 'birthDay', 'sex', 'email'],
                    addresses: [
                        { type: 'juridical', fields: ['country', 'state', 'area', 'city', 'street', 'houseNo', 'flatNo'] },
                        { type: 'factual', fields: ['country', 'state', 'area', 'city', 'street', 'houseNo', 'flatNo'] },
                    ],
                    documents: [
                        {
                            type: BankIdDocumentType.Passport,
                            fields: ['typeName', 'series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
                        },
                        {
                            type: BankIdDocumentType.IdPassport,
                            fields: ['typeName', 'series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
                        },
                        {
                            type: BankIdDocumentType.ForeignPassport,
                            fields: ['typeName', 'series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
                        },
                        {
                            type: BankIdDocumentType.Ident,
                            fields: ['typeName', 'series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
                        },
                    ],
                }),
            ],
            [
                BankIdVersion.V2,
                JSON.stringify({
                    cert,
                }),
            ],
        ])(
            'should successfully verify and return bankId user data for version %s',
            async (bankIdVersion: BankIdVersion, clientPayload: string) => {
                const memberId = randomUUID()
                const encryptedUser = {
                    state: 'state',
                    cert,
                    customerCrypto: 'customer-encrypted',
                    memberId,
                }
                const verifyParams: AuthMethodVerifyParams = {
                    headers,
                    bankId,
                }
                const accessToken = 'some-access-token'
                const config = <AppConfig>{
                    app: {
                        integrationPointsTimeout: 30000,
                    },
                    bankId: {
                        clientId,
                        clientSecret,
                        host,
                        tokenPath,
                        userPath,
                        bankIdVersion,
                        datasetInUse: BankIdDataset.DATASET_11,
                        authPath,
                        isEnabled: true,
                        rejectUnauthorized: true,
                        verifyMemberId: true,
                    },
                }
                const getAccessTokenResult = { data: { access_token: accessToken } }
                const { platformType, appVersion } = headers

                const bankIdProvider = new BankIdProvider(
                    config,
                    loggerMock,
                    httpServiceMock,
                    bankServiceMock,
                    bankIdAuthRequestServiceMock,
                    fakeBankLoginServiceMock,
                    bankIdCryptoServiceClient,
                )

                jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, getAccessTokenResult])
                jest.spyOn(bankServiceMock, 'getBankMemberId').mockResolvedValueOnce(memberId)
                jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert })
                jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: encryptedUser }])
                jest.spyOn(bankIdCryptoServiceClient, 'decrypt').mockResolvedValueOnce({ data: JSON.stringify(bankIdUser) })

                expect(await bankIdProvider.verify(requestId, verifyParams)).toEqual(bankIdUser)

                expect(fakeBankLoginServiceMock.getFakeDataToApply).toHaveBeenCalledWith(platformType, appVersion)
                expect(loggerMock.info).toHaveBeenCalledWith('Start getting access token using authorization code', { code: requestId })
                expect(httpServiceMock.post).toHaveBeenCalledWith(
                    {
                        host: config.bankId.host,
                        path: config.bankId.tokenPath,
                        timeout: config.app.integrationPointsTimeout,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    },
                    undefined,
                    {
                        code: requestId,
                        grant_type: 'authorization_code',
                        client_id: config.bankId.clientId,
                        client_secret: config.bankId.clientSecret,
                    },
                )
                expect(loggerMock.debug).toHaveBeenCalledWith('Getting access token result', getAccessTokenResult.data)
                expect(bankServiceMock.getBankMemberId).toHaveBeenCalledWith(bankId)
                expect(httpServiceMock.post).toHaveBeenCalledWith(
                    {
                        host: config.bankId.host,
                        path: config.bankId.userPath,
                        headers: {
                            Authorization: `Bearer ${getAccessTokenResult.data.access_token}`,
                            'Content-Type': 'application/json',
                        },
                        rejectUnauthorized: false,
                        timeout: config.app.integrationPointsTimeout,
                    },
                    undefined,
                    clientPayload,
                )
                expect(bankIdCryptoServiceClient.decrypt).toHaveBeenCalledWith(encryptedUser)
            },
        )

        it('should successfully return fake data if exists', async () => {
            const verifyParams: AuthMethodVerifyParams = {
                headers,
                bankId,
            }
            const config = <AppConfig>{}

            const bankIdProvider = new BankIdProvider(
                config,
                loggerMock,
                httpServiceMock,
                bankServiceMock,
                bankIdAuthRequestServiceMock,
                fakeBankLoginServiceMock,
                bankIdCryptoServiceClient,
            )

            const { platformType, appVersion } = headers
            const getFakeDataToApplySpy = jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply')

            getFakeDataToApplySpy.mockReset().mockResolvedValueOnce(<FakeBankLoginSettings>{
                requestId,
                bankIdUser,
            })

            expect(await bankIdProvider.verify(requestId, verifyParams)).toEqual(bankIdUser)

            expect(fakeBankLoginServiceMock.getFakeDataToApply).toHaveBeenCalledWith(platformType, appVersion)
        })

        it.each([
            [
                'unable to get access token by code, reason: invalid_request',
                BankIdVersion.V1,
                new UnauthorizedError(),
                (): void => {
                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([
                        <Error>(<unknown>{ data: { error: 'invalid_request' } }),
                        undefined,
                    ])
                },
            ],
            [
                'unable to get access token by code and error has no details',
                BankIdVersion.V1,
                new UnauthorizedError(),
                (): void => {
                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([new Error(), undefined])
                },
            ],
            [
                'unable to get access token by code, reason: access_denied',
                BankIdVersion.V1,
                new UnauthorizedError(),
                (): void => {
                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([
                        <Error>(<unknown>{ data: { error: 'access_denied' } }),
                        undefined,
                    ])
                },
            ],
            [
                'unable to get access token by code, reason: temporarily_unavailable',
                BankIdVersion.V1,
                new ServiceUnavailableError(),
                (): void => {
                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([
                        <Error>(<unknown>{ data: { error: 'temporarily_unavailable' } }),
                        undefined,
                    ])
                },
            ],
            [
                'unable to get access token by code, reason: unknown error',
                BankIdVersion.V1,
                new UnauthorizedError(),
                (): void => {
                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([<Error>(<unknown>{ data: { error: 'unknown' } }), undefined])
                },
            ],
            [
                'unable to generate bankId certificate',
                BankIdVersion.V1,
                new Error('BankId: Certificate generation error'),
                (): void => {
                    const memberId = randomUUID()
                    const accessToken = 'some-access-token'
                    const getAccessTokenResult = { data: { access_token: accessToken } }

                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, getAccessTokenResult])
                    jest.spyOn(bankServiceMock, 'getBankMemberId').mockResolvedValueOnce(memberId)
                    jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockRejectedValueOnce(
                        new Error('Unable to generate certificate'),
                    )
                },
            ],
            [
                'bank id version is unhandled',
                <BankIdVersion>'unhandled-version',
                new TypeError('Unhandled bank id version type: unhandled-version'),
                (): void => {
                    const memberId = randomUUID()
                    const accessToken = 'some-access-token'
                    const getAccessTokenResult = { data: { access_token: accessToken } }

                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, getAccessTokenResult])
                    jest.spyOn(bankServiceMock, 'getBankMemberId').mockResolvedValueOnce(memberId)
                    jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert })
                },
            ],
            [
                'unable to get user by certificate, reason: unable to send request',
                BankIdVersion.V1,
                new UnauthorizedError(),
                (): void => {
                    const memberId = randomUUID()
                    const accessToken = 'some-access-token'
                    const getAccessTokenResult = { data: { access_token: accessToken } }

                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, getAccessTokenResult])
                    jest.spyOn(bankServiceMock, 'getBankMemberId').mockResolvedValueOnce(memberId)
                    jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert })
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([new Error('Unable to send request'), undefined])
                },
            ],
            [
                'unable to get user by certificate, reason: invalid_cert',
                BankIdVersion.V1,
                new UnauthorizedError(),
                (): void => {
                    const memberId = randomUUID()
                    const accessToken = 'some-access-token'
                    const getAccessTokenResult = { data: { access_token: accessToken } }

                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, getAccessTokenResult])
                    jest.spyOn(bankServiceMock, 'getBankMemberId').mockResolvedValueOnce(memberId)
                    jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert })
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([
                        <Error>(<unknown>{ data: { error: 'invalid_cert' } }),
                        undefined,
                    ])
                },
            ],
            [
                'unable to get user by certificate, reason: invalid_token',
                BankIdVersion.V1,
                new UnauthorizedError(),
                (): void => {
                    const memberId = randomUUID()
                    const accessToken = 'some-access-token'
                    const getAccessTokenResult = { data: { access_token: accessToken } }

                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, getAccessTokenResult])
                    jest.spyOn(bankServiceMock, 'getBankMemberId').mockResolvedValueOnce(memberId)
                    jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert })
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: { error: 'invalid_token' } }])
                },
            ],
            [
                'mismatched memberId while getting user',
                BankIdVersion.V1,
                new AccessDeniedError(),
                (): void => {
                    const memberId = randomUUID()
                    const accessToken = 'some-access-token'
                    const getAccessTokenResult = { data: { access_token: accessToken } }

                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, getAccessTokenResult])
                    jest.spyOn(bankServiceMock, 'getBankMemberId').mockResolvedValueOnce(memberId)
                    jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert })
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: { memberId: 'wrong-member-id' } }])
                },
            ],
            [
                'unable to decrypt bank id user data',
                BankIdVersion.V1,
                new UnauthorizedError(),
                (): void => {
                    const memberId = randomUUID()
                    const accessToken = 'some-access-token'
                    const getAccessTokenResult = { data: { access_token: accessToken } }

                    jest.spyOn(fakeBankLoginServiceMock, 'getFakeDataToApply').mockResolvedValueOnce(undefined)
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, getAccessTokenResult])
                    jest.spyOn(bankServiceMock, 'getBankMemberId').mockResolvedValueOnce(memberId)
                    jest.spyOn(bankIdCryptoServiceClient, 'generateCertificate').mockResolvedValueOnce({ cert })
                    jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { data: { memberId } }])
                    jest.spyOn(bankIdCryptoServiceClient, 'decrypt').mockRejectedValueOnce(new Error('Unable to decrypt data'))
                },
            ],
        ])(
            'should fail with error in case %s',
            async (_msg: string, bankIdVersion: BankIdVersion, expectedError: Error, defineSpies: CallableFunction) => {
                const verifyParams: AuthMethodVerifyParams = {
                    headers,
                    bankId,
                }
                const config = <AppConfig>{
                    app: {
                        integrationPointsTimeout: 30000,
                    },
                    bankId: {
                        clientId,
                        clientSecret,
                        host,
                        tokenPath,
                        userPath,
                        bankIdVersion,
                        datasetInUse: BankIdDataset.DATASET_11,
                        authPath,
                        isEnabled: true,
                        rejectUnauthorized: true,
                        verifyMemberId: true,
                    },
                }

                const bankIdProvider = new BankIdProvider(
                    config,
                    loggerMock,
                    httpServiceMock,
                    bankServiceMock,
                    bankIdAuthRequestServiceMock,
                    fakeBankLoginServiceMock,
                    bankIdCryptoServiceClient,
                )

                defineSpies()

                await expect(async () => {
                    await bankIdProvider.verify(requestId, verifyParams)
                }).rejects.toEqual(expectedError)
            },
        )
    })
})
