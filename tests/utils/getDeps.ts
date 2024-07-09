import { asClass } from 'awilix'

import { DepsFactoryFn, MoleculerService } from '@diia-inhouse/diia-app'

import TestKit, { mockClass } from '@diia-inhouse/test'

import deps from '@src/deps'

import { TestDeps } from '@tests/interfaces/utils'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export default async (config: AppConfig): ReturnType<DepsFactoryFn<AppConfig, AppDeps & TestDeps>> => {
    return {
        ...(await deps(config)),

        testKit: asClass(TestKit).singleton(),
        moleculer: asClass(mockClass(MoleculerService)).singleton(),
    }
}
