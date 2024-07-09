import { randomUUID } from 'node:crypto'

const googleIntegrityCheckModelMock = {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findOne: jest.fn(),
    modelName: 'googleIntegrityCheck',
}

jest.mock('@models/integrity/googleIntegrityCheck', () => googleIntegrityCheckModelMock)

import { AnalyticsActionResult, AnalyticsActionType, AnalyticsService } from '@diia-inhouse/analytics'
import { MongoDBErrorCode } from '@diia-inhouse/db'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalEventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, ModelNotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import IntegrityChallengeResultService from '@services/integrity/challengeResult'
import GoogleIntegrityCheckService from '@services/integrity/googleCheck'

import { MongoDbApiError } from '@tests/unit/stubs'

import { ExternalEvent } from '@interfaces/application'
import { GoogleIntegrityCheckStatus } from '@interfaces/models/integrity/googleIntegrityCheck'

describe(`${GoogleIntegrityCheckService.constructor.name}`, () => {
    const testKit = new TestKit()
    const logger = mockInstance(DiiaLogger)
    const externalEventBus = <ExternalEventBus>(<unknown>{ publish: jest.fn() })
    const analyticsService = mockInstance(AnalyticsService)
    const integrityChallengeResultService = new IntegrityChallengeResultService(analyticsService)
    const service = new GoogleIntegrityCheckService(logger, externalEventBus, integrityChallengeResultService)

    describe(`method: ${service.createIntegrityChallenge.name}`, () => {
        it('should create integrity check', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const { mobileUid } = headers
            const {
                user: { identifier },
            } = session
            const nonce = randomUUID()

            googleIntegrityCheckModelMock.deleteMany.mockResolvedValueOnce({ deletedCount: 1 })
            googleIntegrityCheckModelMock.create.mockResolvedValueOnce({ nonce })

            const result = await service.createIntegrityChallenge(identifier, headers)

            expect(googleIntegrityCheckModelMock.deleteMany).toHaveBeenCalledWith({ mobileUid })
            expect(googleIntegrityCheckModelMock.create).toHaveBeenCalled()
            expect(result).toEqual(nonce)
        })

        it('should throw error if integrity check was not created', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier },
            } = session
            const err = new Error('Mocked error')

            googleIntegrityCheckModelMock.deleteMany.mockResolvedValueOnce({ deletedCount: 1 })
            googleIntegrityCheckModelMock.create.mockRejectedValueOnce(err)

            await expect(service.createIntegrityChallenge(identifier, headers)).rejects.toThrow(err)
        })

        it('should throw AccessDeniedError when throwed error with code DuplicateKey', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier },
            } = session
            const err = new MongoDbApiError('message', MongoDBErrorCode.DuplicateKey, { mobileUid: headers.mobileUid })

            googleIntegrityCheckModelMock.deleteMany.mockResolvedValueOnce({ deletedCount: 1 })
            googleIntegrityCheckModelMock.create.mockRejectedValueOnce(err)

            await expect(service.createIntegrityChallenge(identifier, headers)).rejects.toThrow(
                new AccessDeniedError('Nonce is already requested by a current device'),
            )
        })
    })

    describe(`method: ${service.launchIntegrityChallenge.name}`, () => {
        it('should update integrityCheck model and publish IntegrityGoogleDevice event', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const { mobileUid } = headers
            const {
                user: { identifier: userIdentifier },
            } = session
            const integrityCheck = { userIdentifier, mobileUid, headers, save: jest.fn() }
            const signedAttestationStatement = randomUUID()

            googleIntegrityCheckModelMock.findOne.mockResolvedValueOnce(integrityCheck)

            await service.launchIntegrityChallenge(userIdentifier, mobileUid, signedAttestationStatement)

            expect(integrityCheck.save).toHaveBeenCalled()
            expect(integrityCheck).toMatchObject({ checkStatus: GoogleIntegrityCheckStatus.CheckLaunched })
            expect(externalEventBus.publish).toHaveBeenCalledWith(ExternalEvent.IntegrityGoogleDevice, {
                uuid: expect.any(String),
                request: { userIdentifier, signedAttestationStatement, headers },
            })
        })

        it('should throw error if integrityCheck model was not found', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const { mobileUid } = headers
            const {
                user: { identifier: userIdentifier },
            } = session
            const signedAttestationStatement = randomUUID()

            googleIntegrityCheckModelMock.findOne.mockResolvedValueOnce(null)

            await expect(service.launchIntegrityChallenge(userIdentifier, mobileUid, signedAttestationStatement)).rejects.toThrow(
                new AccessDeniedError('Could not find integrity check entity'),
            )
        })
    })

    describe(`method: ${service.onGoogleIntegrityCheckComplete.name}`, () => {
        it('should complete successful integrity check', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const nonce = randomUUID()
            const integrityResultData = {
                requestDetails: {
                    requestPackageName: 'packageName',
                    timestampMillis: Date.now(),
                    nonce,
                },
                appIntegrity: {
                    appRecognitionVerdict: 'PLAY_RECOGNIZED',
                    versionCode: 2,
                },
                deviceIntegrity: {
                    deviceRecognitionVerdict: ['MEETS_STRONG_INTEGRITY'],
                },
                accountDetails: {
                    appLicensingVerdict: 'LICENSED',
                },
            }
            const integrityCheck = { headers, userIdentifier, nonce, save: jest.fn() }

            googleIntegrityCheckModelMock.findOne.mockResolvedValueOnce(integrityCheck)

            await service.onGoogleIntegrityCheckComplete(userIdentifier, headers, integrityResultData)

            expect(integrityCheck.save).toHaveBeenCalled()
            expect(integrityCheck).toMatchObject({ integrityResultData, checkStatus: GoogleIntegrityCheckStatus.CheckSucceeded })
            expect(analyticsService.authLog).toHaveBeenCalledWith(
                AnalyticsActionType.Attestation,
                AnalyticsActionResult.Confirming,
                userIdentifier,
                headers,
            )
        })

        it.each([
            ['do not meets strong integrity', ['DO_NOT_MEETS_STRONG_INTEGRITY'], 'PLAY_RECOGNIZED', 'LICENSED'],
            ['app is not recognized', ['MEETS_STRONG_INTEGRITY'], 'PLAY_NOT_RECOGNIZED', 'LICENSED'],
            ['app is not licensed', ['MEETS_STRONG_INTEGRITY'], 'PLAY_RECOGNIZED', 'NOT_LICENSED'],
        ])(
            'should complete failed integrity check when %s',
            async (_msg, deviceRecognitionVerdict, appRecognitionVerdict, appLicensingVerdict) => {
                const { session, headers } = testKit.session.getUserActionArguments()
                const {
                    user: { identifier: userIdentifier },
                } = session
                const nonce = randomUUID()
                const integrityResultData = {
                    requestDetails: {
                        requestPackageName: 'packageName',
                        timestampMillis: Date.now(),
                        nonce,
                    },
                    appIntegrity: { appRecognitionVerdict, versionCode: 2 },
                    deviceIntegrity: { deviceRecognitionVerdict },
                    accountDetails: { appLicensingVerdict },
                }
                const integrityCheck = { headers, userIdentifier, nonce, save: jest.fn() }

                googleIntegrityCheckModelMock.findOne.mockResolvedValueOnce(integrityCheck)

                await service.onGoogleIntegrityCheckComplete(userIdentifier, headers, integrityResultData)

                expect(integrityCheck.save).toHaveBeenCalled()
                expect(integrityCheck).toMatchObject({ integrityResultData, checkStatus: GoogleIntegrityCheckStatus.CheckFailed })
                expect(analyticsService.authLog).toHaveBeenCalledWith(
                    AnalyticsActionType.Attestation,
                    AnalyticsActionResult.NotConfirmed,
                    userIdentifier,
                    headers,
                )
            },
        )

        it('should throw error if integrityCheck was not found', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const nonce = randomUUID()
            const integrityResultData = {
                requestDetails: {
                    requestPackageName: 'packageName',
                    timestampMillis: Date.now(),
                    nonce,
                },
                appIntegrity: {
                    appRecognitionVerdict: 'PLAY_RECOGNIZED',
                    versionCode: 2,
                },
                deviceIntegrity: {
                    deviceRecognitionVerdict: ['MEETS_STRONG_INTEGRITY'],
                },
                accountDetails: {
                    appLicensingVerdict: 'LICENSED',
                },
            }

            googleIntegrityCheckModelMock.findOne.mockResolvedValueOnce(null)

            await expect(service.onGoogleIntegrityCheckComplete(userIdentifier, headers, integrityResultData)).rejects.toThrow(
                new ModelNotFoundError(googleIntegrityCheckModelMock.modelName, nonce),
            )
        })

        it('should log failed check in analytics', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const integrityResultData = undefined

            await service.onGoogleIntegrityCheckComplete(userIdentifier, headers, integrityResultData)

            expect(analyticsService.authLog).toHaveBeenCalledWith(
                AnalyticsActionType.Attestation,
                AnalyticsActionResult.NotConfirmed,
                userIdentifier,
                headers,
            )
        })
    })
})
