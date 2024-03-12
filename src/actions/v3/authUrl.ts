import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import AuthService from '@services/auth'
import AuthSchemaService from '@services/authSchema'
import UserAuthStepsService from '@services/userAuthSteps'
import UserAuthTokenService from '@services/userAuthToken'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v3/authUrl'
import { AuthMethod, AuthSchemaModel } from '@interfaces/models/authSchema'
import { UserAuthStepsModel } from '@interfaces/models/userAuthSteps'
import { FaceLivenessDetectionConfigResponse } from '@interfaces/services/authSchema'

export default class AuthUrlAction implements AppAction {
    constructor(
        private readonly authService: AuthService,
        private readonly authSchemaService: AuthSchemaService,
        private readonly userAuthStepsService: UserAuthStepsService,
        private readonly userAuthTokenService: UserAuthTokenService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V3

    readonly name = 'authUrl'

    readonly validationRules: ValidationSchema = {
        target: {
            type: 'string',
            enum: [
                AuthMethod.Monobank,
                AuthMethod.PrivatBank,
                AuthMethod.PhotoId,
                AuthMethod.BankId,
                AuthMethod.Nfc,
                AuthMethod.EResidentQrCode,
                AuthMethod.EResidentMrz,
                AuthMethod.EResidentNfc,
                AuthMethod.EmailOtp,
                AuthMethod.Qes,
                AuthMethod.Ds,
            ],
        },
        processId: { type: 'string' },
        bankId: { type: 'string', optional: true },
        isLowRamDevice: { type: 'boolean', optional: true, convert: true },
        builtInTrueDepthCamera: { type: 'boolean', optional: true, convert: true },
        email: { type: 'email', optional: true },
    }

    getLockResource(args: CustomActionArguments): string {
        const {
            headers: { mobileUid },
        } = args

        return `user-auth-steps-${mobileUid}`
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { target: method, bankId, processId, isLowRamDevice, builtInTrueDepthCamera, email },
            headers,
            session,
        } = args

        const [authSchema, userAuthSteps]: [AuthSchemaModel, UserAuthStepsModel] = await this.userAuthStepsService.setStepMethod(
            session?.user,
            headers,
            method,
            processId,
        )
        const { code } = authSchema
        const { userIdentifier } = userAuthSteps
        const authUrl: string = await this.authService.getAuthUrl(method, { bankId, userIdentifier, email }, headers, code)

        const response: ActionResult = { authUrl }
        if ([AuthMethod.Nfc, AuthMethod.EResidentNfc, AuthMethod.PhotoId].includes(method)) {
            const [tempToken, fldConfig]: [string, FaceLivenessDetectionConfigResponse] = await Promise.all([
                this.userAuthTokenService.getTemporaryToken(headers),
                this.authSchemaService.getFldConfig(authSchema, headers, isLowRamDevice, builtInTrueDepthCamera),
            ])

            response.token = tempToken
            response.fld = fldConfig
        }

        return response
    }
}
