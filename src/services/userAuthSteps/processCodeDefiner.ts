import { UserAuthStep, UserAuthStepsStatus } from '@interfaces/models/userAuthSteps'
import { ProcessCode } from '@interfaces/services'
import { AuthStepsStatusToAuthMethodProcessCode } from '@interfaces/services/userAuthSteps'

export default class ProcessCodeDefinerService {
    getProcessCodeOnVerify(
        status: UserAuthStepsStatus,
        step: UserAuthStep,
        authStepsStatusToAuthMethodProcessCode: AuthStepsStatusToAuthMethodProcessCode,
    ): ProcessCode {
        const { method } = step
        const authMethodToProcessCode = authStepsStatusToAuthMethodProcessCode[status]
        if (!authMethodToProcessCode) {
            throw new TypeError(`Unhandled status: ${status}`)
        }

        const processCode = authMethodToProcessCode[method]

        if (!processCode) {
            throw new TypeError(`Unhandled method: ${method}`)
        }

        return processCode
    }
}
