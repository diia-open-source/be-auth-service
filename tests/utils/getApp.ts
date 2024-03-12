import { asClass } from 'awilix'

import { Application, MoleculerService, ServiceContext, ServiceOperator } from '@diia-inhouse/diia-app'

import { EventBus, ExternalEventBus, Queue, ScheduledTask, Task } from '@diia-inhouse/diia-queue'
import { mockClass } from '@diia-inhouse/test'

import config from '@src/config'

import { TestDeps } from '@tests/interfaces/utils'
import deps from '@tests/utils/getDeps'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export async function getApp(): Promise<ServiceOperator<AppConfig, AppDeps & TestDeps>> {
    const serviceContext = (await new Application<ServiceContext<AppConfig, AppDeps & TestDeps>>('Auth').setConfig(config)).setDeps(deps)

    const app = serviceContext
        .overrideDeps({
            moleculer: asClass(mockClass(MoleculerService)).singleton(),
            queue: asClass(mockClass(Queue)).singleton(),
            scheduledTask: asClass(mockClass(ScheduledTask)).singleton(),
            eventBus: asClass(mockClass(EventBus)).singleton(),
            externalEventBus: asClass(mockClass(ExternalEventBus)).singleton(),
            task: asClass(mockClass(Task)).singleton(),
        })
        .initialize()

    return app
}
