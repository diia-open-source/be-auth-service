import { randomUUID } from 'crypto'

const attestationModelMock = {
    countDocuments: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    findOne: jest.fn(),
    modelName: 'attestation',
}

jest.mock('@models/integrity/attestation', () => attestationModelMock)

import { AnalyticsActionResult, AnalyticsActionType, AnalyticsService } from '@diia-inhouse/analytics'
import { MongoDBErrorCode } from '@diia-inhouse/db'
import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalEvent, ExternalEventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, ModelNotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import AttestationService from '@services/integrity/attestation'
import IntegrityChallengeResultService from '@services/integrity/challengeResult'

import { MongoDbApiError } from '@tests/unit/stubs'

describe('AttestationService', () => {
    const testKit = new TestKit()
    const logger = mockInstance(DiiaLogger)
    const analyticsService = mockInstance(AnalyticsService)
    const externalEventBus = <ExternalEventBus>(<unknown>{ publish: jest.fn() })
    const integrityChallengeResultService = new IntegrityChallengeResultService(analyticsService)
    const service = new AttestationService(logger, externalEventBus, integrityChallengeResultService)

    describe('method: `createIntegrityChallenge`', () => {
        it('should remove old attestation models and create new one', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const { mobileUid } = headers
            const {
                user: { identifier },
            } = session
            const nonce = randomUUID()

            const deleteManySpy = jest.spyOn(attestationModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount: 1 })
            const createSpy = jest.spyOn(attestationModelMock, 'create').mockResolvedValueOnce({ nonce })

            const result = await service.createIntegrityChallenge(identifier, headers)

            expect(deleteManySpy).toHaveBeenCalledWith({ mobileUid })
            expect(createSpy).toHaveBeenCalled()
            expect(result).toEqual(nonce)
        })

        it('should throw error if attestation was not created', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier },
            } = session
            const err = new Error('Mocked error')

            jest.spyOn(attestationModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount: 1 })
            jest.spyOn(attestationModelMock, 'create').mockRejectedValueOnce(err)

            await expect(service.createIntegrityChallenge(identifier, headers)).rejects.toThrow(err)
        })

        it('should throw AccessDeniedError when throwed error with code DuplicateKey', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier },
            } = session
            const err = new MongoDbApiError('message', MongoDBErrorCode.DuplicateKey, { mobileUid: headers.mobileUid })

            jest.spyOn(attestationModelMock, 'deleteMany').mockResolvedValueOnce({ deletedCount: 1 })
            jest.spyOn(attestationModelMock, 'create').mockRejectedValueOnce(err)

            await expect(service.createIntegrityChallenge(identifier, headers)).rejects.toThrow(
                new AccessDeniedError('Nonce is already requested by a current device'),
            )
        })
    })

    describe(`method: ${service.launchIntegrityChallenge.name}`, () => {
        it('should publish attestation google device external event without nonce', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const { mobileUid } = headers
            const {
                user: { identifier },
            } = session
            const signedAttestationStatement = randomUUID()

            jest.spyOn(attestationModelMock, 'countDocuments').mockResolvedValueOnce(1)
            jest.spyOn(externalEventBus, 'publish').mockResolvedValueOnce(true)

            await service.launchIntegrityChallenge(identifier, mobileUid, signedAttestationStatement)

            expect(externalEventBus.publish).toHaveBeenCalledWith(ExternalEvent.AttestationGoogleDevice, {
                uuid: expect.any(String),
                request: { signedAttestationStatement },
            })
        })

        it('should publish attestation google device external event with nonce', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const { mobileUid } = headers
            const {
                user: { identifier },
            } = session
            const signedAttestationStatement = randomUUID()
            const nonce = randomUUID()

            jest.spyOn(attestationModelMock, 'countDocuments').mockResolvedValueOnce(1)
            jest.spyOn(externalEventBus, 'publish').mockResolvedValueOnce(true)

            await service.launchIntegrityChallenge(identifier, mobileUid, signedAttestationStatement, nonce)

            expect(externalEventBus.publish).toHaveBeenCalledWith(ExternalEvent.AttestationGoogleDevice, {
                uuid: expect.any(String),
                request: { signedAttestationStatement, nonce },
            })
        })

        it('should throw error if attestation documents was not found', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const { mobileUid } = headers
            const {
                user: { identifier },
            } = session
            const signedAttestationStatement = randomUUID()

            jest.spyOn(attestationModelMock, 'countDocuments').mockResolvedValueOnce(0)

            await expect(service.launchIntegrityChallenge(identifier, mobileUid, signedAttestationStatement)).rejects.toThrow(
                new AccessDeniedError('Could not find attestation entity'),
            )
        })
    })

    describe(`method: ${service.onSafetyNetAttestationComplete.name}`, () => {
        it('should complete successful attestation', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const nonce = randomUUID()
            const ctsProfileMatch = true
            const resultData = { basicIntegrity: true }
            const attestation = { headers, userIdentifier, nonce, save: jest.fn() }

            jest.spyOn(attestationModelMock, 'findOne').mockResolvedValueOnce(attestation)

            await service.onSafetyNetAttestationComplete(nonce, ctsProfileMatch, resultData)

            expect(attestation.save).toHaveBeenCalled()
            expect(attestation).toMatchObject({ ctsProfileMatch, resultData })
            expect(analyticsService.authLog).toHaveBeenCalledWith(
                AnalyticsActionType.Attestation,
                AnalyticsActionResult.Confirming,
                userIdentifier,
                headers,
            )
        })

        it('should complete failed attestation', async () => {
            const { session, headers } = testKit.session.getUserActionArguments()
            const {
                user: { identifier: userIdentifier },
            } = session
            const nonce = randomUUID()
            const ctsProfileMatch = false
            const resultData = { basicIntegrity: true }
            const attestation = { headers, userIdentifier, nonce, save: jest.fn() }
            const error = { message: 'fail', http_code: HttpStatusCode.FORBIDDEN }

            jest.spyOn(attestationModelMock, 'findOne').mockResolvedValueOnce(attestation)

            await service.onSafetyNetAttestationComplete(nonce, ctsProfileMatch, resultData, error)

            expect(attestation.save).toHaveBeenCalled()
            expect(attestation).toMatchObject({ ctsProfileMatch, resultData, error })
            expect(analyticsService.authLog).toHaveBeenCalledWith(
                AnalyticsActionType.Attestation,
                AnalyticsActionResult.NotConfirmed,
                userIdentifier,
                headers,
            )
        })

        it('should throw error if attestation document was not found', async () => {
            const nonce = randomUUID()
            const ctsProfileMatch = false
            const resultData = { basicIntegrity: true }

            jest.spyOn(attestationModelMock, 'findOne').mockResolvedValueOnce(undefined)

            await expect(service.onSafetyNetAttestationComplete(nonce, ctsProfileMatch, resultData)).rejects.toThrow(
                new ModelNotFoundError(attestationModelMock.modelName, nonce),
            )
        })
    })
})
