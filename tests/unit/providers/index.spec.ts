const asClass = jest.fn()
const singleton = jest.fn()

jest.mock('awilix', () => ({
    ...jest.requireActual('awilix'),
    asClass,
}))

import { mockInstance } from '@diia-inhouse/test'

import { getProvidersDeps } from '@src/providers'

import EnemyTrackTelegramBotService from '@providers/enemyTrack/telegramBot'

describe('Provides', () => {
    describe('method: getProvidersDeps', () => {
        it('should successfully compose and return providers deps', () => {
            const enemyTrackProviderMock = mockInstance(EnemyTrackTelegramBotService)

            singleton.mockReturnValueOnce(enemyTrackProviderMock)
            asClass.mockReturnValue({ singleton })

            expect(getProvidersDeps()).toEqual({
                enemyTrackProvider: enemyTrackProviderMock,
            })
            expect(asClass).toHaveBeenCalledWith(EnemyTrackTelegramBotService)
            expect(singleton).toHaveBeenCalledWith()
        })
    })
})
