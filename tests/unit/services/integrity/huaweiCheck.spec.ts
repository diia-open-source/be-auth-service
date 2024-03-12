import { randomUUID } from 'crypto'

const huaweiIntegrityCheckModelMock = {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findOne: jest.fn(),
    modelName: 'huaweiIntegrityCheck',
}

jest.mock('@models/integrity/huaweiIntegrityCheck', () => huaweiIntegrityCheckModelMock)

import { AnalyticsActionResult, AnalyticsActionType, AnalyticsService } from '@diia-inhouse/analytics'
import { MongoDBErrorCode } from '@diia-inhouse/db'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalEvent, ExternalEventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, ModelNotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import IntegrityChallengeResultService from '@services/integrity/challengeResult'
import HuaweiIntegrityCheckService from '@services/integrity/huaweiCheck'

import { MongoDbApiError } from '@tests/unit/stubs'

import { GoogleIntegrityCheckStatus } from '@interfaces/models/integrity/googleIntegrityCheck'

describe(`${HuaweiIntegrityCheckService.constructor.name}`, () => {
    const testKit = new TestKit()
    const logger = mockInstance(DiiaLogger)
    const externalEventBus = <ExternalEventBus>(<unknown>{ publish: jest.fn() })
    const analyticsService = mockInstance(AnalyticsService)
    const integrityChallengeResultService = new IntegrityChallengeResultService(analyticsService)
    const service = new HuaweiIntegrityCheckService(logger, externalEventBus, integrityChallengeResultService)

    describe(`method: ${service.createIntegrityChallenge.name}`, () => {
        it('should create integrity check', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const { mobileUid } = headers
            const {
                user: { identifier },
            } = session
            const nonce = randomUUID()

            huaweiIntegrityCheckModelMock.deleteMany.mockResolvedValueOnce({ deletedCount: 1 })
            huaweiIntegrityCheckModelMock.create.mockResolvedValueOnce({ nonce })

            const result = await service.createIntegrityChallenge(identifier, headers)

            expect(huaweiIntegrityCheckModelMock.deleteMany).toHaveBeenCalledWith({ mobileUid })
            expect(huaweiIntegrityCheckModelMock.create).toHaveBeenCalled()
            expect(result).toEqual(nonce)
        })

        it('should throw error if integrity check was not created', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier },
            } = session
            const err = new Error('Mocked error')

            huaweiIntegrityCheckModelMock.deleteMany.mockResolvedValueOnce({ deletedCount: 1 })
            huaweiIntegrityCheckModelMock.create.mockRejectedValueOnce(err)

            await expect(service.createIntegrityChallenge(identifier, headers)).rejects.toThrow(err)
        })

        it('should throw AccessDeniedError when throwed error with code DuplicateKey', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier },
            } = session
            const err = new MongoDbApiError('message', MongoDBErrorCode.DuplicateKey, { mobileUid: headers.mobileUid })

            huaweiIntegrityCheckModelMock.deleteMany.mockResolvedValueOnce({ deletedCount: 1 })
            huaweiIntegrityCheckModelMock.create.mockRejectedValueOnce(err)

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

            huaweiIntegrityCheckModelMock.findOne.mockResolvedValueOnce(integrityCheck)

            await service.launchIntegrityChallenge(userIdentifier, mobileUid, signedAttestationStatement)

            expect(integrityCheck.save).toHaveBeenCalled()
            expect(integrityCheck).toMatchObject({ checkStatus: GoogleIntegrityCheckStatus.CheckLaunched })
            expect(externalEventBus.publish).toHaveBeenCalledWith(ExternalEvent.AttestationHuaweiDevice, {
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

            huaweiIntegrityCheckModelMock.findOne.mockResolvedValueOnce(undefined)

            await expect(service.launchIntegrityChallenge(userIdentifier, mobileUid, signedAttestationStatement)).rejects.toThrow(
                new AccessDeniedError('Could not find integrity check entity'),
            )
        })
    })

    describe(`method: ${service.onHuaweiIntegrityCheckComplete.name}`, () => {
        it('should complete successful integrity check', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const nonce = randomUUID()
            const integrityResultData = {
                apkCertificateDigestSha256: [randomUUID()],
                apkDigestSha256: randomUUID(),
                apkPackageName: randomUUID(),
                appId: randomUUID(),
                basicIntegrity: true,
                timestampMs: Date.now(),
                nonce,
            }
            const integrityCheck = { headers, userIdentifier, nonce, save: jest.fn() }

            huaweiIntegrityCheckModelMock.findOne.mockResolvedValueOnce(integrityCheck)

            await service.onHuaweiIntegrityCheckComplete(userIdentifier, headers, integrityResultData)

            expect(integrityCheck.save).toHaveBeenCalled()
            expect(integrityCheck).toMatchObject({ integrityResultData, checkStatus: GoogleIntegrityCheckStatus.CheckSucceeded })
            expect(analyticsService.authLog).toHaveBeenCalledWith(
                AnalyticsActionType.Attestation,
                AnalyticsActionResult.Confirming,
                userIdentifier,
                headers,
            )
        })

        it('should complete failed integrity check', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const nonce = randomUUID()
            const integrityResultData = {
                apkCertificateDigestSha256: [randomUUID()],
                apkDigestSha256: randomUUID(),
                apkPackageName: randomUUID(),
                appId: randomUUID(),
                basicIntegrity: false,
                timestampMs: Date.now(),
                nonce,
            }
            const integrityCheck = { headers, userIdentifier, nonce, save: jest.fn() }
            const error = { message: 'Failure', http_code: HttpStatusCode.BAD_REQUEST }

            huaweiIntegrityCheckModelMock.findOne.mockResolvedValueOnce(integrityCheck)

            await service.onHuaweiIntegrityCheckComplete(userIdentifier, headers, integrityResultData, error)

            expect(integrityCheck.save).toHaveBeenCalled()
            expect(integrityCheck).toMatchObject({ integrityResultData, error, checkStatus: GoogleIntegrityCheckStatus.CheckFailed })
            expect(analyticsService.authLog).toHaveBeenCalledWith(
                AnalyticsActionType.Attestation,
                AnalyticsActionResult.NotConfirmed,
                userIdentifier,
                headers,
            )
        })

        it('should throw error if integrityCheck was not found', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const nonce = randomUUID()
            const integrityResultData = {
                apkCertificateDigestSha256: [randomUUID()],
                apkDigestSha256: randomUUID(),
                apkPackageName: randomUUID(),
                appId: randomUUID(),
                basicIntegrity: true,
                timestampMs: Date.now(),
                nonce,
            }

            huaweiIntegrityCheckModelMock.findOne.mockResolvedValueOnce(undefined)

            await expect(service.onHuaweiIntegrityCheckComplete(userIdentifier, headers, integrityResultData)).rejects.toThrow(
                new ModelNotFoundError(huaweiIntegrityCheckModelMock.modelName, nonce),
            )
        })

        it('should log failed check in analytics', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const integrityResultData = undefined

            await service.onHuaweiIntegrityCheckComplete(userIdentifier, headers, integrityResultData)

            expect(analyticsService.authLog).toHaveBeenCalledWith(
                AnalyticsActionType.Attestation,
                AnalyticsActionResult.NotConfirmed,
                userIdentifier,
                headers,
            )
        })
    })
})
