import { randomUUID } from 'crypto'

const uuidV4Stub = jest.fn()

jest.mock('uuid', () => ({ v4: uuidV4Stub }))

import { VerifyInfoResponse } from '@diia-inhouse/diia-crypto-client'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import DsProvider from '@services/authMethods/ds'
import DiiaSignatureService from '@services/diiaSignature'
import DocumentAcquirersService from '@services/documentAcquirers'
import NonceService from '@services/nonce'

import { cryptoDocServiceClient } from '@tests/mocks/grpc/clients'

import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { AuthMethodVerifyParams } from '@interfaces/services/auth'

describe('DsProvider', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const diiaSignatureServiceMock = mockInstance(DiiaSignatureService)
    const documentAcquirersServiceMock = mockInstance(DocumentAcquirersService)
    const nonceServiceMock = mockInstance(NonceService)

    describe('method: requestAuthorizationUrl', () => {
        const headers = testKit.session.getHeaders()
        const requestUuid = randomUUID()
        const requestId = Buffer.from(requestUuid).toString('base64')
        const hashedRequestId = 'some-hash'
        const deeplink = 'some-deeplink'

        it('should successfully compose and return authorization url', async () => {
            const config = <AppConfig>(<unknown>{
                auth: {
                    schema: {
                        schemaMap: {
                            [AuthSchemaCode.CabinetAuthorization]: { nonceCacheTtl: 180000 },
                        },
                    },
                },
            })
            const { mobileUid: deviceUuid } = headers

            const dsProvider = new DsProvider(
                config,
                loggerMock,
                diiaSignatureServiceMock,
                documentAcquirersServiceMock,
                nonceServiceMock,
                cryptoDocServiceClient,
            )

            uuidV4Stub.mockReturnValueOnce(requestUuid)
            jest.spyOn(cryptoDocServiceClient, 'docGenerateHash').mockResolvedValueOnce({ hash: hashedRequestId })
            jest.spyOn(documentAcquirersServiceMock, 'createOfferRequest').mockResolvedValueOnce({ deeplink })
            jest.spyOn(nonceServiceMock, 'saveNonce').mockResolvedValueOnce()

            expect(await dsProvider.requestAuthorizationUrl({}, headers)).toBe(
                `${deeplink}?requestId=${encodeURIComponent(hashedRequestId)}`,
            )

            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(cryptoDocServiceClient.docGenerateHash).toHaveBeenCalledWith({ content: requestId })
            expect(documentAcquirersServiceMock.createOfferRequest).toHaveBeenCalledWith(hashedRequestId)
            expect(nonceServiceMock.saveNonce).toHaveBeenCalledWith(deviceUuid, requestId, 180000)
        })

        it.each([
            [
                'is not able to generate hashed requestId',
                <AppConfig>(<unknown>{ auth: { schema: { schemaMap: { [AuthSchemaCode.CabinetAuthorization]: {} } } } }),
                new BadRequestError('Generate hash failed'),
                (): void => {
                    uuidV4Stub.mockReturnValueOnce(requestUuid)
                    jest.spyOn(cryptoDocServiceClient, 'docGenerateHash').mockRejectedValueOnce(new Error('Unable to generate hash'))
                },
                (): void => {
                    expect(uuidV4Stub).toHaveBeenCalledWith()
                    expect(cryptoDocServiceClient.docGenerateHash).toHaveBeenCalledWith({ content: requestId })
                    expect(loggerMock.error).toHaveBeenCalledWith('Generate hash failed. Reason:', {
                        err: new Error('Unable to generate hash'),
                    })
                },
            ],
            [
                'is not able to create offer request and get deeplink',
                <AppConfig>(<unknown>{ auth: { schema: { schemaMap: { [AuthSchemaCode.CabinetAuthorization]: {} } } } }),
                new AccessDeniedError(`Unable to get deeplink for requestId: ${hashedRequestId}`),
                (): void => {
                    uuidV4Stub.mockReturnValueOnce(requestUuid)
                    jest.spyOn(cryptoDocServiceClient, 'docGenerateHash').mockResolvedValueOnce({ hash: hashedRequestId })
                    jest.spyOn(documentAcquirersServiceMock, 'createOfferRequest').mockRejectedValueOnce(
                        new Error('Unable to create offer request'),
                    )
                },
                (): void => {
                    expect(uuidV4Stub).toHaveBeenCalledWith()
                    expect(cryptoDocServiceClient.docGenerateHash).toHaveBeenCalledWith({ content: requestId })
                    expect(documentAcquirersServiceMock.createOfferRequest).toHaveBeenCalledWith(hashedRequestId)
                    expect(loggerMock.error).toHaveBeenCalledWith(`Unable to get deeplink for requestId: ${hashedRequestId} Reason:`, {
                        err: new Error('Unable to create offer request'),
                    })
                },
            ],
            [
                'nonce ttl is not defined in configuration',
                <AppConfig>(<unknown>{ auth: { schema: { schemaMap: { [AuthSchemaCode.CabinetAuthorization]: {} } } } }),
                new BadRequestError('NonceTTL is not defined'),
                (): void => {
                    uuidV4Stub.mockReturnValueOnce(requestUuid)
                    jest.spyOn(cryptoDocServiceClient, 'docGenerateHash').mockResolvedValueOnce({ hash: hashedRequestId })
                    jest.spyOn(documentAcquirersServiceMock, 'createOfferRequest').mockResolvedValueOnce({ deeplink })
                },
                (): void => {
                    expect(uuidV4Stub).toHaveBeenCalledWith()
                    expect(cryptoDocServiceClient.docGenerateHash).toHaveBeenCalledWith({ content: requestId })
                    expect(documentAcquirersServiceMock.createOfferRequest).toHaveBeenCalledWith(hashedRequestId)
                },
            ],
        ])(
            'should fail with error in case %s',
            async (
                _msg: string,
                customConfig: AppConfig,
                expectedError: Error,
                defineSpies: CallableFunction,
                checkExpectations: CallableFunction,
            ) => {
                const dsProvider = new DsProvider(
                    customConfig,
                    loggerMock,
                    diiaSignatureServiceMock,
                    documentAcquirersServiceMock,
                    nonceServiceMock,
                    cryptoDocServiceClient,
                )

                defineSpies()

                await expect(async () => {
                    await dsProvider.requestAuthorizationUrl({}, headers)
                }).rejects.toEqual(expectedError)

                checkExpectations()
            },
        )
    })

    describe('method: verify', () => {
        const requestId = randomUUID()
        const nonce = 'some-nonce'
        const headers = testKit.session.getHeaders()
        const signature = 'some-signature'

        it('should successfully verify signature and return signer info', async () => {
            const { user } = testKit.session.getUserSession()
            const verifyParams: AuthMethodVerifyParams = {
                headers,
            }
            const signerInfo = {
                subjFullName: [user.fName, user.lName, user.mName].join(' '),
                issuer: 'issuer',
                issuerCn: 'issuerCn',
                serial: 'serial',
                subjCn: 'subjCn',
                subjDrfoCode: 'subjDrfoCode',
                subject: 'subject',
            }
            const { mobileUid } = headers

            const dsProvider = new DsProvider(
                <AppConfig>{},
                loggerMock,
                diiaSignatureServiceMock,
                documentAcquirersServiceMock,
                nonceServiceMock,
                cryptoDocServiceClient,
            )

            jest.spyOn(nonceServiceMock, 'getNonceAndRemove').mockResolvedValueOnce(nonce)
            jest.spyOn(diiaSignatureServiceMock, 'getSignature').mockResolvedValueOnce(signature)
            jest.spyOn(cryptoDocServiceClient, 'docVerifySignExternal').mockResolvedValueOnce(<VerifyInfoResponse>{ ownerInfo: signerInfo })

            expect(await dsProvider.verify(requestId, verifyParams)).toEqual({ ...signerInfo, authMethod: AuthMethod.Ds })

            expect(nonceServiceMock.getNonceAndRemove).toHaveBeenCalledWith(mobileUid)
            expect(diiaSignatureServiceMock.getSignature).toHaveBeenCalledWith(requestId)
            expect(cryptoDocServiceClient.docVerifySignExternal).toHaveBeenCalledWith({
                signature,
                data: nonce,
            })
        })

        it.each([
            [
                'unable to get signature',
                new AccessDeniedError(`Unable to get signature for requestId: ${requestId}`),
                (): void => {
                    jest.spyOn(nonceServiceMock, 'getNonceAndRemove').mockResolvedValueOnce(nonce)
                    jest.spyOn(diiaSignatureServiceMock, 'getSignature').mockRejectedValueOnce(
                        new Error('Unable to get signature for requestId'),
                    )
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nonceServiceMock.getNonceAndRemove).toHaveBeenCalledWith(mobileUid)
                    expect(diiaSignatureServiceMock.getSignature).toHaveBeenCalledWith(requestId)
                    expect(loggerMock.error).toHaveBeenCalledWith(`Unable to get signature for requestId: ${requestId} Reason:`, {
                        err: new Error('Unable to get signature for requestId'),
                    })
                },
            ],
            [
                'unable to verify signature',
                new AccessDeniedError('Verify signature for DS method has failed'),
                (): void => {
                    jest.spyOn(nonceServiceMock, 'getNonceAndRemove').mockResolvedValueOnce(nonce)
                    jest.spyOn(diiaSignatureServiceMock, 'getSignature').mockResolvedValueOnce(signature)
                    jest.spyOn(cryptoDocServiceClient, 'docVerifySignExternal').mockRejectedValueOnce(new Error('Invalid signature'))
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nonceServiceMock.getNonceAndRemove).toHaveBeenCalledWith(mobileUid)
                    expect(diiaSignatureServiceMock.getSignature).toHaveBeenCalledWith(requestId)
                    expect(cryptoDocServiceClient.docVerifySignExternal).toHaveBeenCalledWith({
                        signature,
                        data: nonce,
                    })
                    expect(loggerMock.error).toHaveBeenCalledWith('Verify signature for DS method has failed. Reason:', {
                        err: new Error('Invalid signature'),
                    })
                },
            ],
        ])(
            'should fail with error in case %s',
            async (_msg: string, expectedError: Error, defineSpies: CallableFunction, checkExpectations: CallableFunction) => {
                const verifyParams: AuthMethodVerifyParams = {
                    headers,
                }

                const dsProvider = new DsProvider(
                    <AppConfig>{},
                    loggerMock,
                    diiaSignatureServiceMock,
                    documentAcquirersServiceMock,
                    nonceServiceMock,
                    cryptoDocServiceClient,
                )

                defineSpies()

                await expect(async () => {
                    await dsProvider.verify(requestId, verifyParams)
                }).rejects.toEqual(expectedError)

                checkExpectations()
            },
        )
    })
})
