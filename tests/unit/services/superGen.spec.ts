import { MoleculerService } from '@diia-inhouse/diia-app'

import { mockInstance } from '@diia-inhouse/test'
import { ActionVersion } from '@diia-inhouse/types'

import SuperGenService from '@services/superGen'

describe(`${SuperGenService.name}`, () => {
    const mockMoleculerService = mockInstance(MoleculerService)

    const superGenService = new SuperGenService(mockMoleculerService)

    describe('method: `generateEResidentOTPEmail`', () => {
        it('should return email', async () => {
            const email = 'email'
            const otp = 'otp'

            jest.spyOn(mockMoleculerService, 'act').mockResolvedValueOnce(email)

            expect(await superGenService.generateEResidentOTPEmail(otp)).toBe(email)
            expect(mockMoleculerService.act).toHaveBeenCalledWith(
                'SuperGen',
                {
                    name: 'generateEResidentOTPEmail',
                    actionVersion: ActionVersion.V1,
                },
                {
                    params: { otp },
                },
            )
            expect(mockMoleculerService.act).toHaveBeenCalledTimes(1)
        })
    })
})
