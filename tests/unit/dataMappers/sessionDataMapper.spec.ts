import { randomUUID } from 'node:crypto'

import { IdentifierService } from '@diia-inhouse/crypto'
import { InternalServerError } from '@diia-inhouse/errors'
import { I18nService } from '@diia-inhouse/i18n'
import { mockInstance } from '@diia-inhouse/test'
import { AuthDocumentType } from '@diia-inhouse/types'

import refreshToken from '@models/refreshToken'

import SessionDataMapper from '@dataMappers/sessionDataMapper'

import { Locales } from '@interfaces/locales'
import { AuthMethod } from '@interfaces/models/authSchema'
import { RefreshTokenModel } from '@interfaces/models/refreshToken'
import { AuthType } from '@interfaces/services/session'

describe('SessionDataMapper', () => {
    const identifierService = mockInstance(IdentifierService, {
        createIdentifier: () => 'identifier',
    })
    const i18nService = mockInstance(I18nService<Locales>)

    const mapper = new SessionDataMapper(identifierService, i18nService)

    describe('method: `getStatus`', () => {
        test('should return true for valid RefreshTokenModel', () => {
            const validRefreshToken: Partial<RefreshTokenModel> = {
                isDeleted: false,
                expired: false,
            }

            const refreshTokenDoc = new refreshToken(validRefreshToken)

            const result = mapper.getStatus(refreshTokenDoc)

            expect(result).toBe(true)
        })

        test('should return false for deleted RefreshTokenModel', () => {
            const deletedRefreshToken: Partial<RefreshTokenModel> = {
                isDeleted: true,
                expired: false,
            }

            const refreshTokenDoc = new refreshToken(deletedRefreshToken)

            const result = mapper.getStatus(refreshTokenDoc)

            expect(result).toBe(false)
        })

        test('should return false for expired RefreshTokenModel', () => {
            const deletedRefreshToken: Partial<RefreshTokenModel> = {
                isDeleted: false,
                expired: true,
            }

            const refreshTokenDoc = new refreshToken(deletedRefreshToken)

            const result = mapper.getStatus(refreshTokenDoc)

            expect(result).toBe(false)
        })
    })

    describe('method: `toEntity`', () => {
        test('should map RefreshTokenModel interface to Session interface', () => {
            const mockRefreshToken: Partial<RefreshTokenModel> = {
                platformType: 'Android',
                platformVersion: '1.0.0',
                appVersion: '2.0.0',
                authEntryPointHistory: [
                    {
                        authEntryPoint: {
                            target: AuthMethod.BankId,
                            isBankId: true,
                        },
                        date: new Date(),
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                mobileUid: randomUUID(),
                isDeleted: false,
                expired: false,
            }

            const refreshTokenDoc = new refreshToken(mockRefreshToken)

            const result = mapper.toEntity(refreshTokenDoc, 'MyBank')

            expect(result).toMatchObject({
                id: expect.any(String),
                status: true,
                platform: {
                    type: 'Android',
                    version: '1.0.0',
                },
                appVersion: '2.0.0',
                auth: {
                    type: AuthType.BankId,
                    bank: 'MyBank',
                    creationDate: expect.any(String),
                    lastActivityDate: expect.any(String),
                },
            })
        })

        test('should throw InternalServerError for unexpected auth method', () => {
            const unexpectedAuthRefreshToken: Partial<RefreshTokenModel> = {
                authEntryPointHistory: [
                    {
                        authEntryPoint: {
                            target: 'unexpectedAuthMethod',
                            isBankId: false,
                        },
                        date: new Date(),
                    },
                ],
            }
            const refreshTokenDoc = new refreshToken(unexpectedAuthRefreshToken)

            expect(() => {
                mapper.toEntity(refreshTokenDoc)
            }).toThrow(InternalServerError)
        })

        test('should map RefreshTokenModel interface to Session interface with auth IdCard document', () => {
            const nfcDocumentToName = 'ID карта'

            const mockRefreshToken: Partial<RefreshTokenModel> = {
                platformType: 'Android',
                platformVersion: '1.0.0',
                appVersion: '2.0.0',
                authEntryPointHistory: [
                    {
                        authEntryPoint: {
                            target: AuthMethod.Nfc,
                            isBankId: false,
                            document: AuthDocumentType.IdCard,
                        },
                        date: new Date(),
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivityDate: new Date(),
                mobileUid: randomUUID(),
                isDeleted: false,
                expired: false,
            }

            const refreshTokenDoc = new refreshToken(mockRefreshToken)

            const result = mapper.toEntity(refreshTokenDoc, 'MyBank')

            expect(result).toMatchObject({
                id: expect.any(String),
                status: true,
                platform: {
                    type: 'Android',
                    version: '1.0.0',
                },
                appVersion: '2.0.0',
                auth: {
                    type: AuthType.Nfc,
                    bank: 'MyBank',
                    creationDate: expect.any(String),
                    lastActivityDate: expect.any(String),
                    document: nfcDocumentToName,
                },
            })
        })
    })

    describe('method: `toEntityWithActions`', () => {
        test('should map RefreshTokenModel interface to SessionWithActions interface', () => {
            const actionSharingName = i18nService.get('sessionWithActions.action.sharing.name')
            const actionSigningName = i18nService.get('sessionWithActions.action.signing.name')

            const mockRefreshToken: Partial<RefreshTokenModel> = {
                platformType: 'Android',
                platformVersion: '1.0.0',
                appVersion: '2.0.0',
                authEntryPointHistory: [
                    {
                        authEntryPoint: {
                            target: AuthMethod.BankId,
                            isBankId: false,
                        },
                        date: new Date(),
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivityDate: new Date(),
                mobileUid: randomUUID(),
                isDeleted: false,
                expired: false,
            }

            const model = new refreshToken(mockRefreshToken)

            const sharingBadge = 123
            const signingBadge = 456
            const bank = 'MyBank'

            const result = mapper.toEntityWithActions(model, sharingBadge, signingBadge, bank)

            expect(result).toMatchObject({
                id: expect.any(String),
                status: true,
                platform: {
                    type: 'Android',
                    version: '1.0.0',
                },
                appVersion: '2.0.0',
                auth: {
                    type: AuthType.BankId,
                    bank: 'MyBank',
                    creationDate: expect.any(String),
                    lastActivityDate: expect.any(String),
                },
                action: {
                    sharing: {
                        name: actionSharingName,
                        badge: 123,
                    },
                    signing: {
                        name: actionSigningName,
                        badge: 456,
                    },
                },
            })
        })

        test('should map RefreshTokenModel interface to SessionWithActions interface with mocked action names', () => {
            const mockRefreshToken: Partial<RefreshTokenModel> = {
                platformType: 'Android',
                platformVersion: '1.0.0',
                appVersion: '2.0.0',
                authEntryPointHistory: [
                    {
                        authEntryPoint: {
                            target: AuthMethod.BankId,
                            isBankId: false,
                        },
                        date: new Date(),
                    },
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivityDate: new Date(),
                mobileUid: randomUUID(),
                isDeleted: false,
                expired: false,
            }

            const model = new refreshToken(mockRefreshToken)

            const sharingBadge = 123
            const signingBadge = 456
            const bank = 'MyBank'

            jest.spyOn(i18nService, 'get').mockImplementation(() => 'test-action-name')

            const result = mapper.toEntityWithActions(model, sharingBadge, signingBadge, bank)

            expect(result).toMatchObject({
                id: expect.any(String),
                status: true,
                platform: {
                    type: 'Android',
                    version: '1.0.0',
                },
                appVersion: '2.0.0',
                auth: {
                    type: AuthType.BankId,
                    bank: 'MyBank',
                    creationDate: expect.any(String),
                    lastActivityDate: expect.any(String),
                },
                action: {
                    sharing: {
                        name: 'test-action-name',
                        badge: 123,
                    },
                    signing: {
                        name: 'test-action-name',
                        badge: 456,
                    },
                },
            })
        })
    })
})
