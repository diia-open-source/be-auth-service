import { asClass } from 'awilix'

import { DepsResolver } from '@diia-inhouse/diia-app'

import EnemyTrackProvider from '@providers/enemyTrack/telegramBot'

import { ProvidersDeps } from '@interfaces/providers'

export function getProvidersDeps(): DepsResolver<ProvidersDeps> {
    return {
        enemyTrackProvider: asClass(EnemyTrackProvider).singleton(),
    }
}
