import { AuthService } from '@diia-inhouse/crypto'
import { AccessDeniedError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { Gender, OwnerType, UserTokenData, VerifiedBaseTokenData } from '@diia-inhouse/types'

import OpenIdService from '@services/openId'
import UserService from '@services/user'

import { AppConfig } from '@interfaces/config'
import { DocumentType } from '@interfaces/services/documents'
import { GetUserDocumentsResult } from '@interfaces/services/user'

describe(`${OpenIdService.name}`, () => {
    const testKit = new TestKit()
    const authServiceMock = mockInstance(AuthService)
    const userServiceMock = mockInstance(UserService)

    describe('method: `getUserOpenIdDetails`', () => {
        const token = 'token'
        const itn = testKit.session.generateItn(testKit.session.getBirthDate(), testKit.session.getGender(), false)

        it('should throw AccessDeniedError if user does not have a valid rnookpp', async () => {
            const config = <AppConfig>(<unknown>{
                openid: {
                    enableDocumentsCheck: true,
                },
            })

            const userTokenData = <VerifiedBaseTokenData<UserTokenData>>{
                identifier: 'identifier',
            }

            const userDocs = <GetUserDocumentsResult>(<unknown>{
                documents: [
                    {
                        documentType: DocumentType.DriverLicense,
                        documentIdentifier: 'documentIdentifier',
                        ownerType: OwnerType.owner,
                    },
                ],
            })

            const openIdService = new OpenIdService(authServiceMock, userServiceMock, config)

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(userTokenData)
            jest.spyOn(userServiceMock, 'getUserDocuments').mockResolvedValueOnce(userDocs)

            await expect(async () => {
                await openIdService.getUserOpenIdDetails(token)
            }).rejects.toEqual(new AccessDeniedError('user does not have a valid rnokpp'))
        })

        it('should throw AccessDeniedError if user does not have a valid passport', async () => {
            const config = <AppConfig>(<unknown>{
                openid: {
                    enableDocumentsCheck: true,
                },
            })

            const userTokenData = <VerifiedBaseTokenData<UserTokenData>>{
                identifier: 'identifier',
            }

            const userDocs = <GetUserDocumentsResult>(<unknown>{
                documents: [
                    {
                        documentType: DocumentType.TaxpayerCard,
                        documentIdentifier: 'documentIdentifier',
                        ownerType: OwnerType.owner,
                    },
                ],
            })

            const openIdService = new OpenIdService(authServiceMock, userServiceMock, config)

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(userTokenData)
            jest.spyOn(userServiceMock, 'getUserDocuments').mockResolvedValueOnce(userDocs)

            await expect(async () => {
                await openIdService.getUserOpenIdDetails(token)
            }).rejects.toEqual(new AccessDeniedError('user does not have a valid passport'))
        })

        it('should return user open id details', async () => {
            const config = <AppConfig>(<unknown>{
                openid: {
                    enableDocumentsCheck: true,
                },
            })

            const userTokenData = <VerifiedBaseTokenData<UserTokenData>>{
                email: 'email',
                fName: 'fName',
                lName: 'lName',
                mName: 'mName',
                itn,
                identifier: 'identifier',
                gender: Gender.female,
                birthDay: '01.01.1990',
                phoneNumber: '1111111',
            }

            const userDocs = <GetUserDocumentsResult>(<unknown>{
                documents: [
                    {
                        documentType: DocumentType.TaxpayerCard,
                        documentIdentifier: 'documentIdentifier',
                        ownerType: OwnerType.owner,
                        docId: '1234567890',
                    },
                    {
                        documentType: DocumentType.ForeignPassport,
                        documentIdentifier: 'documentIdentifier',
                        ownerType: OwnerType.owner,
                        docId: '1234567890',
                    },
                ],
            })

            const userOpenIdData = {
                email: userTokenData.email,
                firstName: userTokenData.fName,
                lastName: userTokenData.lName,
                givenName: userTokenData.mName,
                rnokpp: userTokenData.itn,
                gender: userTokenData.gender,
                birthDay: userTokenData.birthDay,
                phoneNumber: userTokenData.phoneNumber,
                unzr: '1234567890',
            }

            const openIdService = new OpenIdService(authServiceMock, userServiceMock, config)

            jest.spyOn(authServiceMock, 'validate').mockResolvedValueOnce(userTokenData)
            jest.spyOn(userServiceMock, 'getUserDocuments').mockResolvedValueOnce(userDocs)
            expect(await openIdService.getUserOpenIdDetails(token)).toMatchObject(userOpenIdData)
        })
    })
})
