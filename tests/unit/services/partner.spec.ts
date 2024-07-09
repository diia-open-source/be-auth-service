import { MoleculerService } from '@diia-inhouse/diia-app'

import { mongo } from '@diia-inhouse/db'
import { mockInstance } from '@diia-inhouse/test'
import { ActionVersion } from '@diia-inhouse/types'

import PartnerService from '@services/partner'

describe(`${PartnerService.name}`, () => {
    const mockMoleculerService = mockInstance(MoleculerService)

    const partnerService = new PartnerService(mockMoleculerService)

    describe('method: `getPartnerByToken`', () => {
        it('should return partner result info', async () => {
            const partnerToken = 'token'
            const result = { _id: new mongo.ObjectId(), scopes: {} }

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(result)

            expect(await partnerService.getPartnerByToken(partnerToken)).toMatchObject(result)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'Partner',
                { name: 'getPartnerByToken', actionVersion: ActionVersion.V1 },
                { params: { partnerToken } },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })
})
