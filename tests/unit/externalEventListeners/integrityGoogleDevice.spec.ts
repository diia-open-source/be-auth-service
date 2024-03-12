import { randomUUID } from 'crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'

import IntegrityGoogleDeviceEventListener from '@src/externalEventListeners/integrityGoogleDevice'

import GoogleIntegrityCheckService from '@services/integrity/googleCheck'

import { EventPayload } from '@interfaces/externalEventListeners/integrityGoogleDevice'
import { IntegrityResultData } from '@interfaces/models/integrity/googleIntegrityCheck'

describe(`${IntegrityGoogleDeviceEventListener.name}`, () => {
    const testKit = new TestKit()
    const googleIntegrityCheckServiceMock = mockInstance(GoogleIntegrityCheckService)
    const integrityGoogleDeviceEventListener = new IntegrityGoogleDeviceEventListener(googleIntegrityCheckServiceMock)

    describe(`method: ${integrityGoogleDeviceEventListener.handler.name}`, () => {
        it('should successfully invoke check integrity process', async () => {
            const {
                user: { identifier: userIdentifier },
            } = testKit.session.getUserSession()
            const message: EventPayload = {
                uuid: randomUUID(),
                response: {
                    headers: testKit.session.getHeaders(),
                    userIdentifier,
                    integrityResultData: <IntegrityResultData>{},
                },
            }

            jest.spyOn(googleIntegrityCheckServiceMock, 'onGoogleIntegrityCheckComplete').mockResolvedValueOnce()

            expect(await integrityGoogleDeviceEventListener.handler(message)).toBeUndefined()
            expect(googleIntegrityCheckServiceMock.onGoogleIntegrityCheckComplete).toHaveBeenCalledWith(
                userIdentifier,
                message.response?.headers,
                message.response?.integrityResultData,
                message.error,
            )
        })
    })
})
