import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserAuthStepsService from '@services/userAuthSteps'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/verifyAuthMethod'
import { AuthMethod } from '@interfaces/models/authSchema'
import { ProcessCode } from '@interfaces/services'

export default class VerifyAuthMethodAction implements AppAction {
    constructor(private readonly userAuthStepsService: UserAuthStepsService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'verifyAuthMethod'

    readonly validationRules: ValidationSchema = {
        method: { type: 'string', enum: Object.values(AuthMethod) },
        requestId: { type: 'string' },
        processId: { type: 'string' },
        bankId: { type: 'string', optional: true },
        qrCodePayload: {
            type: 'object',
            optional: true,
            props: {
                token: { type: 'string' },
            },
        },
        mrzPayload: {
            type: 'object',
            optional: true,
            props: {
                docNumber: { type: 'string' },
                residenceCountry: { type: 'string' },
            },
        },
        qesPayload: {
            type: 'object',
            optional: true,
            props: {
                signature: { type: 'string' },
            },
        },
        otp: { type: 'string', optional: true },
    }

    getLockResource(args: CustomActionArguments): string {
        const {
            headers: { mobileUid },
        } = args

        return `user-auth-steps-${mobileUid}`
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { method, requestId, processId, bankId, qrCodePayload, mrzPayload, qesPayload, otp },
            headers,
            session,
        } = args

        const processCode: ProcessCode = await this.userAuthStepsService.verifyAuthMethod(
            method,
            requestId,
            session?.user,
            headers,
            processId,
            {
                headers,
                bankId,
                qrCodePayload,
                mrzPayload,
                qesPayload,
                otp,
            },
        )

        return { processCode }
    }
}
