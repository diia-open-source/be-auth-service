import { MoleculerService } from '@diia-inhouse/diia-app'

import { mockInstance } from '@diia-inhouse/test'
import { ActionVersion, PortalUserPetitionPermissions, PortalUserPollPermissions } from '@diia-inhouse/types'

import BackOfficePetitionService from '@services/backOfficePetition'

describe(`${BackOfficePetitionService.name}`, () => {
    const mockMoleculerService = mockInstance(MoleculerService)
    const backOfficePetitionService = new BackOfficePetitionService(mockMoleculerService)

    describe('method: `getPortalUserPermissions`', () => {
        it('should return portal user permissions', async () => {
            const mockIdentifier = 'identifier'
            const mockPermissions = {
                petition: PortalUserPetitionPermissions.administrator,
                poll: PortalUserPollPermissions.masterAdministrator,
            }

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(mockPermissions)

            expect(await backOfficePetitionService.getPortalUserPermissions(mockIdentifier)).toMatchObject(mockPermissions)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'BackOfficePetition',
                { name: 'getPortalUserPermissions', actionVersion: ActionVersion.V1 },
                { params: { userIdentifier: mockIdentifier } },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })
})
