import { AppAction } from '@diia-inhouse/diia-app'

import { IdentifierService } from '@diia-inhouse/crypto'
import { ActionVersion, Gender, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import TestService from '@services/test'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/testGetToken'

export default class TestGetTokenAction implements AppAction {
    constructor(
        private readonly identifier: IdentifierService,

        private readonly testService: TestService,
    ) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name = 'testGetToken'

    private genderAllowedValues: string[] = [...Object.values(Gender), '']

    readonly validationRules: ValidationSchema = {
        requestId: { type: 'string' },
        fName: { type: 'string', optional: true },
        lName: { type: 'string', optional: true },
        mName: { type: 'string', optional: true },
        email: { type: 'string', optional: true },
        birthDay: { type: 'string', optional: true },
        gender: { type: 'string', enum: this.genderAllowedValues, optional: true },
        document: { type: 'string', optional: true },
        addressOfRegistration: { type: 'string', optional: true },
        skipLogoutEvent: { type: 'boolean', optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { requestId, fName, lName, mName, email, birthDay, gender, document, addressOfRegistration, skipLogoutEvent },
            headers,
        } = args

        const { token, identifier } = await this.testService.getUserToken(
            requestId,
            headers,
            {
                fName,
                lName,
                mName,
                email,
                birthDay,
                gender,
                document,
                addressOfRegistration,
            },
            { skipLogoutEvent },
        )

        const channelUuid = this.identifier.createIdentifier(identifier)

        return { token, channelUuid }
    }
}
