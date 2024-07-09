import { Application, ServiceContext, ServiceOperator } from '@diia-inhouse/diia-app'

import config from '@src/config'

import { TestDeps } from '@tests/interfaces/utils'
import deps from '@tests/utils/getDeps'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export async function getApp(): Promise<ServiceOperator<AppConfig, AppDeps & TestDeps>> {
    const app = new Application<ServiceContext<AppConfig, AppDeps & TestDeps>>('Auth')

    await app.setConfig(config)
    await app.setDeps(deps)

    const appOperator = await app.initialize()

    await appOperator.start()

    return appOperator
}
