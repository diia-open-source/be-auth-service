import { asClass } from 'awilix'

import { NameAndRegistrationPair } from '@diia-inhouse/diia-app'

import EnemyTrackProvider from '@providers/enemyTrack/telegramBot'

import { ProvidersDeps } from '@interfaces/providers'

export function getProvidersDeps(): NameAndRegistrationPair<ProvidersDeps> {
    return {
        enemyTrackProvider: asClass(EnemyTrackProvider).singleton(),
    }
}
