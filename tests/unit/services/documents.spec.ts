import { MoleculerService } from '@diia-inhouse/diia-app'

import { mockInstance } from '@diia-inhouse/test'
import { ActionVersion, SessionType, UserTokenData } from '@diia-inhouse/types'

import DocumentsService from '@services/documents'

import { DocumentType, EResidency, EResidencyCountryInfo } from '@interfaces/services/documents'

describe(`${DocumentsService.name}`, () => {
    let mockMoleculerService: MoleculerService
    let documentsService: DocumentsService

    beforeEach(() => {
        mockMoleculerService = mockInstance(MoleculerService)
        documentsService = new DocumentsService(mockMoleculerService)
    })

    describe('method: `checkPassport`', () => {
        it('should return check passport result', async () => {
            const mockUserData = <UserTokenData>{}
            const handlePhoto = false

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce({ exists: true })

            expect(await documentsService.checkPassport(mockUserData, handlePhoto)).toMatchObject({ exists: true })
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Documents',
                { name: 'checkPassport', actionVersion: ActionVersion.V1 },
                {
                    params: { handlePhoto },
                    session: { sessionType: SessionType.User, user: mockUserData },
                },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `getEResidencyToProcess`', () => {
        it('should return e-residency data', async () => {
            const params = { qrCodeToken: 'token' }
            const resultData = <EResidency>{}

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(resultData)

            expect(await documentsService.getEResidencyToProcess(params)).toMatchObject(resultData)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Documents',
                { name: 'getEResidencyToProcess', actionVersion: ActionVersion.V1 },
                { params },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `expireDocument`', () => {
        it('should successfully execute method', async () => {
            const mockUserData = <UserTokenData>{}

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(null)

            expect(await documentsService.expireDocument(mockUserData, DocumentType.EResidency)).toBeNull()
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Documents',
                { name: 'expireDocument', actionVersion: ActionVersion.V1 },
                {
                    params: { documentType: DocumentType.EResidency },
                    session: { sessionType: SessionType.User, user: mockUserData },
                },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `hasDocumentInRegistry`', () => {
        it('should return true', async () => {
            const mockUserData = <UserTokenData>{}

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(true)

            expect(await documentsService.hasDocumentInRegistry(DocumentType.EResidency, mockUserData)).toBe(true)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Documents',
                {
                    name: 'hasDocumentInRegistry',
                    actionVersion: ActionVersion.V1,
                },
                {
                    params: { documentType: DocumentType.EResidency },
                    session: { sessionType: SessionType.User, user: mockUserData },
                },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })

    describe('method: `getEResidentCountriesInfo`', () => {
        it('should return e-resident country info', async () => {
            const countryInfo: EResidencyCountryInfo[] = []

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(countryInfo)

            expect(await documentsService.getEResidentCountriesInfo()).toMatchObject(countryInfo)
            expect(mockMoleculerService.act).toHaveBeenCalledWith('Documents', {
                name: 'getEResidentCountriesInfo',
                actionVersion: ActionVersion.V1,
            })
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })

        it('should return empty array when country info is undefined', async () => {
            const emptyArray: EResidencyCountryInfo[] = []

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(null)

            await expect(documentsService.getEResidentCountriesInfo()).resolves.toMatchObject(emptyArray)
        })
    })
})
