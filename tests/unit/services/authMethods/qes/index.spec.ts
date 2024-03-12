import { randomUUID } from 'crypto'

const uuidV4Stub = jest.fn()

jest.mock('uuid', () => ({ v4: uuidV4Stub }))

import { VerifyInfoResponse } from '@diia-inhouse/diia-crypto-client'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import QesProvider from '@services/authMethods/qes'
import NonceService from '@services/nonce'

import { cryptoDocServiceClient } from '@tests/mocks/grpc/clients'

import { AppConfig } from '@interfaces/config'
import { AuthMethod, AuthSchemaCode } from '@interfaces/models/authSchema'
import { AuthMethodVerifyParams } from '@interfaces/services/auth'
import { QesPayload } from '@interfaces/services/userAuthSteps'

describe('QesProvider', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const nonceServiceMock = mockInstance(NonceService)

    describe('method: requestAuthorizationUrl', () => {
        const requestId = randomUUID()
        const headers = testKit.session.getHeaders()

        it('should successfully create nonce and return it as authorization url', async () => {
            const { mobileUid: deviceUuid } = headers
            const nonceCacheTtl = 180000
            const config = <AppConfig>(<unknown>{
                auth: {
                    schema: {
                        schemaMap: {
                            [AuthSchemaCode.CabinetAuthorization]: {
                                nonceCacheTtl,
                            },
                        },
                    },
                },
            })

            const qesProvider = new QesProvider(config, loggerMock, nonceServiceMock, cryptoDocServiceClient)

            uuidV4Stub.mockReturnValueOnce(requestId)
            jest.spyOn(nonceServiceMock, 'saveNonce').mockResolvedValueOnce()

            expect(await qesProvider.requestAuthorizationUrl({}, headers)).toBe(requestId)

            expect(uuidV4Stub).toHaveBeenCalledWith()
            expect(nonceServiceMock.saveNonce).toHaveBeenCalledWith(deviceUuid, requestId, nonceCacheTtl)
        })

        it('should fail with error in case nonceCacheTtl is not defined', async () => {
            const config = <AppConfig>(<unknown>{
                auth: {
                    schema: {
                        schemaMap: {
                            [AuthSchemaCode.CabinetAuthorization]: {},
                        },
                    },
                },
            })

            const qesProvider = new QesProvider(config, loggerMock, nonceServiceMock, cryptoDocServiceClient)

            uuidV4Stub.mockReturnValueOnce(requestId)

            await expect(async () => {
                await qesProvider.requestAuthorizationUrl({}, headers)
            }).rejects.toEqual(new BadRequestError('NonceTTL is not defined'))

            expect(uuidV4Stub).toHaveBeenCalledWith()
        })
    })

    describe('method: verify', () => {
        const requestId = randomUUID()
        const signature = 'qes-signature'
        const headers = testKit.session.getHeaders()
        const config = <AppConfig>(<unknown>{
            auth: {
                schema: {
                    schemaMap: {
                        [AuthSchemaCode.CabinetAuthorization]: {},
                    },
                },
            },
        })
        const qesProvider = new QesProvider(config, loggerMock, nonceServiceMock, cryptoDocServiceClient)

        it('should successfully verify qes signature', async () => {
            const { user } = testKit.session.getUserSession()
            const verifyParams: AuthMethodVerifyParams = {
                qesPayload: {
                    signature,
                },
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

            jest.spyOn(nonceServiceMock, 'getNonceAndRemove').mockResolvedValueOnce(requestId)
            jest.spyOn(cryptoDocServiceClient, 'docVerifySignExternal').mockResolvedValueOnce(<VerifyInfoResponse>{ ownerInfo: signerInfo })

            expect(await qesProvider.verify(requestId, verifyParams)).toEqual({ ...signerInfo, authMethod: AuthMethod.Qes })

            expect(nonceServiceMock.getNonceAndRemove).toHaveBeenCalledWith(mobileUid)
            expect(cryptoDocServiceClient.docVerifySignExternal).toHaveBeenCalledWith({
                signature,
                data: Buffer.from(requestId).toString('base64'),
            })
        })

        it.each([
            [
                'qesPayload is not provided',
                new BadRequestError(`qesPayload is required for ${AuthMethod.Qes} auth method`),
                (): void => {},
                (): void => {},
                undefined,
            ],
            [
                'unable to validate signature',
                new AccessDeniedError('Verify signature for QES method has failed'),
                (): void => {
                    jest.spyOn(nonceServiceMock, 'getNonceAndRemove').mockResolvedValueOnce(requestId)
                    jest.spyOn(cryptoDocServiceClient, 'docVerifySignExternal').mockRejectedValueOnce(new Error('Invalid signature'))
                },
                (): void => {
                    const { mobileUid } = headers

                    expect(nonceServiceMock.getNonceAndRemove).toHaveBeenCalledWith(mobileUid)
                    expect(cryptoDocServiceClient.docVerifySignExternal).toHaveBeenCalledWith({
                        signature,
                        data: Buffer.from(requestId).toString('base64'),
                    })
                    expect(loggerMock.error).toHaveBeenCalledWith('Verify signature for QES method has failed. Reason:', {
                        err: expect.any(Error),
                    })
                },
                { signature },
            ],
        ])(
            'should fail with error in case %s',
            async (
                _msg: string,
                expectedError: Error,
                defineSpies: CallableFunction,
                checkExpectations: CallableFunction,
                qesPayload?: QesPayload,
            ) => {
                const verifyParams: AuthMethodVerifyParams = {
                    qesPayload,
                    headers,
                }

                defineSpies()

                await expect(async () => {
                    await qesProvider.verify(requestId, verifyParams)
                }).rejects.toEqual(expectedError)

                checkExpectations()
            },
        )
    })
})
