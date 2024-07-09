import { randomUUID } from 'node:crypto'

import { MoleculerService } from '@diia-inhouse/diia-app'

import { EventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { ActionVersion, CabinetUserSession, SessionType, UserSession } from '@diia-inhouse/types'

import UserService from '@services/user'

import { InternalEvent } from '@interfaces/application'
import { DiiaIdAction } from '@interfaces/services/diiaId'
import { DocumentType } from '@interfaces/services/documents'
import { HistoryAction } from '@interfaces/services/user'
import { AuthUser, AuthUserSessionType } from '@interfaces/services/userAuthToken'

const wrapMethod = (name: string, actionVersion: ActionVersion = ActionVersion.V1): { name: string; actionVersion: ActionVersion } => ({
    name,
    actionVersion,
})
const wrapParams = <T>(obj: T): { params: T } => ({ params: obj })

describe('Service: `UserService`', () => {
    const moleculerService = mockInstance(MoleculerService)
    const eventBus = mockInstance(EventBus)

    const userService: UserService = new UserService(moleculerService, eventBus)

    const testKit = new TestKit()
    const headers = testKit.session.getHeaders()

    const serviceName = 'User'
    const userIdentifier = randomUUID()
    const mobileUidToFilter = randomUUID()
    const documentType = DocumentType.DriverLicense
    const documentIdentifier = randomUUID()
    const photo = randomUUID()

    describe('method: `createOrUpdateProfile`', () => {
        it.each([[testKit.session.getCabinetUserSession()], [testKit.session.getUserSession()]])(
            `should call publish in eventBus for sessionType: '%s'`,
            (userSessionMocked: UserSession | CabinetUserSession) => {
                const { user, sessionType } = userSessionMocked
                const { itn, gender, birthDay } = user

                userService.createOrUpdateProfile(user, headers, sessionType)

                expect(eventBus.publish).toHaveBeenCalledWith(InternalEvent.AuthCreateOrUpdateUserProfile, {
                    itn,
                    gender,
                    birthDay,
                    headers,
                })
            },
        )

        it(`should call publish in eventBus for sessionType: '${SessionType.EResident}'`, () => {
            const { user, sessionType } = testKit.session.getEResidentSession()
            const { identifier, gender, birthDay } = user

            userService.createOrUpdateProfile(user, headers, sessionType)

            expect(eventBus.publish).toHaveBeenCalledWith(InternalEvent.AuthCreateOrUpdateEResidentProfile, {
                userIdentifier: identifier,
                gender,
                birthDay,
                headers,
            })
        })

        it(`should call publish in eventBus for sessionType: '${SessionType.EResidentApplicant}'`, async () => {
            const { user, sessionType } = testKit.session.getEResidentApplicantSession()

            jest.spyOn(eventBus, 'publish').mockClear()

            userService.createOrUpdateProfile(user, headers, sessionType)

            expect(eventBus.publish).not.toHaveBeenCalled()
        })

        it.each([
            [testKit.session.getAcquirerSession()],
            [testKit.session.getPartnerSession()],
            [testKit.session.getTemporarySession()],
            [testKit.session.getPortalUserSession()],
            [testKit.session.getServiceUserSession()],
            [testKit.session.getServiceEntranceSession()],
        ])('should throw AccessDeniedError for sessionType: `%s`', async (session) => {
            const { sessionType } = session

            await expect(userService.createOrUpdateProfile(<AuthUser>{}, headers, <AuthUserSessionType>sessionType)).rejects.toThrow(
                AccessDeniedError,
            )
        })
    })

    describe('method: `areFeaturePointsExist`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')

            userService.areFeaturePointsExist(userIdentifier)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.areFeaturePointsExist.name),
                wrapParams({
                    userIdentifier,
                }),
            )
        })
    })

    describe('method: `getFeaturePoints`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')

            userService.getFeaturePoints(userIdentifier)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.getFeaturePoints.name),
                wrapParams({
                    userIdentifier,
                }),
            )
        })
    })

    describe('method: `createDocumentFeaturePoints`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')

            userService.createDocumentFeaturePoints(userIdentifier, documentType, documentIdentifier, photo)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.createDocumentFeaturePoints.name),
                wrapParams({
                    userIdentifier,
                    documentType,
                    documentIdentifier,
                    photo,
                }),
            )
        })
    })

    describe('method: `getUserDocuments`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')

            userService.getUserDocuments(userIdentifier)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.getUserDocuments.name),
                wrapParams({
                    userIdentifier,
                }),
            )
        })
    })

    describe('method: `hasOneOfDocuments`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')

            userService.hasOneOfDocuments(userIdentifier, [documentType])
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.hasOneOfDocuments.name),
                wrapParams({
                    userIdentifier,
                    documentTypes: [documentType],
                }),
            )
        })
    })

    describe('method: `hasDiiaIdIdentifier`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')

            userService.hasDiiaIdIdentifier(userIdentifier, mobileUidToFilter)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.hasDiiaIdIdentifier.name),
                wrapParams({
                    userIdentifier,
                    mobileUidToFilter,
                }),
            )
        })
    })

    describe('method: `registerDiiaIdAction`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')
            const action = DiiaIdAction.Creation

            userService.registerDiiaIdAction(userIdentifier, action)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.registerDiiaIdAction.name),
                wrapParams({
                    userIdentifier,
                    action,
                }),
            )
        })
    })

    describe('method: `countHistoryByAction`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')
            const action = HistoryAction.Sharing
            const sessionId = randomUUID()
            const session = testKit.session.getUserSession()

            userService.countHistoryByAction(action, sessionId, session.user)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.countHistoryByAction.name),
                Object.assign(
                    wrapParams({
                        action,
                        sessionId,
                    }),
                    {
                        session,
                    },
                ),
            )
        })
    })

    describe('method: `getServiceUserByLogin`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')
            const login = randomUUID()

            userService.getServiceUserByLogin(login)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.getServiceUserByLogin.name),
                wrapParams({
                    login,
                }),
            )
        })
    })

    describe('method: `encryptDocumentInStorage`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')
            const dataToEncrypt = {}
            const photoToEncrypt = randomUUID()
            const docPhotoToEncrypt = randomUUID()

            userService.encryptDocumentInStorage(userIdentifier, documentType, dataToEncrypt, photoToEncrypt, docPhotoToEncrypt)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.encryptDocumentInStorage.name),
                wrapParams({
                    userIdentifier,
                    documentType,
                    dataToEncrypt,
                    photoToEncrypt,
                    docPhotoToEncrypt,
                }),
            )
        })
    })

    describe('method: `decryptDocumentFromStorage`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')

            userService.decryptDocumentFromStorage(userIdentifier, documentType)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.decryptDocumentFromStorage.name),
                wrapParams({
                    userIdentifier,
                    documentType,
                }),
            )
        })
    })

    describe('method: `addDocumentInStorage`', () => {
        it('should call moleculer service, method: act', () => {
            const actSpy = jest.spyOn(moleculerService, 'act')
            const hashData = randomUUID()
            const encryptedData = randomUUID()

            userService.addDocumentInStorage(userIdentifier, documentType, hashData, encryptedData)
            expect(actSpy).toHaveBeenCalledWith(
                serviceName,
                wrapMethod(userService.addDocumentInStorage.name),
                wrapParams({
                    userIdentifier,
                    documentType,
                    hashData,
                    encryptedData,
                }),
            )
        })
    })
})
