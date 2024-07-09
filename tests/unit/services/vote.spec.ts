import { MoleculerService } from '@diia-inhouse/diia-app'

import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit from '@diia-inhouse/test'

import VoteService from '@services/vote'

import { AppConfig } from '@interfaces/config'

describe('Service: VoteService', () => {
    const moleculerService = <MoleculerService>(<unknown>{
        act: jest.fn(),
    })
    const logger = <DiiaLogger>(<unknown>{
        error: jest.fn(),
    })
    const enabledVoteService = new VoteService(
        <AppConfig>{
            joinUserToPetitions: {
                isEnabled: true,
            },
        },
        logger,
        moleculerService,
    )
    const disabledVoteService = new VoteService(
        <AppConfig>{
            joinUserToPetitions: {
                isEnabled: false,
            },
        },
        logger,
        moleculerService,
    )

    const testKit = new TestKit()
    const { user } = testKit.session.getPortalUserSession()

    describe(`method: 'joinUserToPetitions'`, () => {
        it('should call moleculer service', async () => {
            const actSpy = jest.spyOn(moleculerService, 'act').mockResolvedValueOnce({
                success: true,
            })

            await enabledVoteService.joinUserToPetitions(user)

            expect(actSpy).toHaveBeenCalled()
        })

        it('should log error message when MoleculerService return false', async () => {
            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce({
                success: false,
            })
            const errorSpy = jest.spyOn(logger, 'error')

            await enabledVoteService.joinUserToPetitions(user)

            expect(errorSpy).toHaveBeenCalledWith('Failed to join user to petitions')
        })

        it('should catch error and log it', async () => {
            const expectedError = new Error('Test error')

            jest.spyOn(moleculerService, 'act').mockRejectedValueOnce(expectedError)
            const errorSpy = jest.spyOn(logger, 'error')

            await enabledVoteService.joinUserToPetitions(user)

            expect(errorSpy).toHaveBeenCalledWith('Failed to join user to petitions', {
                err: expectedError,
            })
        })

        it('should call nothing for disabled config', async () => {
            const actSpy = jest.spyOn(moleculerService, 'act')
            const errorSpy = jest.spyOn(logger, 'error')

            await disabledVoteService.joinUserToPetitions(user)

            expect(actSpy).not.toHaveBeenCalled()
            expect(errorSpy).not.toHaveBeenCalled()
        })
    })
})
