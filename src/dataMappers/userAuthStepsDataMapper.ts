import { BadRequestError } from '@diia-inhouse/errors'
import { Logger } from '@diia-inhouse/types'

import { AuthMethod, AuthSchemaModel } from '@interfaces/models/authSchema'
import { UserAuthStep, UserAuthStepsModel } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthMethodsResponse, ButtonAction } from '@interfaces/services/userAuthSteps'

export default class UserAuthStepsDataMapper {
    constructor(private readonly logger: Logger) {}

    toAuthMethodsResponse(
        authSchema: AuthSchemaModel,
        authSteps: UserAuthStepsModel,
        authMethods: AuthMethod[],
        processCode?: ProcessCode,
    ): AuthMethodsResponse {
        const { title, description } = authSchema
        const { processId, steps = [] } = authSteps.toObject()

        return {
            processId,
            title,
            description,
            authMethods: this.getAuthMethods(steps, authMethods),
            button: {
                action: ButtonAction.Close,
            },
            processCode,
            skipAuthMethods: false,
        }
    }

    private getAuthMethods(userSteps: UserAuthStep[], authMethods: AuthMethod[]): AuthMethod[] {
        const lastStep: UserAuthStep | undefined = userSteps.at(-1)
        if (!lastStep || lastStep.endDate) {
            return authMethods
        }

        const authMethod = authMethods.find((method: AuthMethod) => method === lastStep.method)
        if (!authMethod) {
            const errorMsg = 'Could not get auth method from the last step'

            this.logger.error(errorMsg, { lastStep, authMethods })

            throw new BadRequestError(errorMsg)
        }

        return [authMethod]
    }
}
