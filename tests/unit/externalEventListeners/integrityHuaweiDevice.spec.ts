import { randomUUID } from 'crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'

import IntegrityHuaweiDeviceEventListener from '@src/externalEventListeners/integrityHuaweiDevice'

import HuaweiIntegrityCheckService from '@services/integrity/huaweiCheck'

import { EventPayload } from '@interfaces/externalEventListeners/integrityHuaweiDevice'
import { HuaweiIntegrityResultData } from '@interfaces/models/integrity/huaweiIntegrityCheck'

describe(`${IntegrityHuaweiDeviceEventListener.name}`, () => {
    const testKit = new TestKit()
    const huaweiIntegrityCheckServiceMock = mockInstance(HuaweiIntegrityCheckService)
    const integrityHuaweiDeviceEventListener = new IntegrityHuaweiDeviceEventListener(huaweiIntegrityCheckServiceMock)

    describe(`method: ${integrityHuaweiDeviceEventListener.handler.name}`, () => {
        it('should successfully invoke check integrity process', async () => {
            const {
                user: { identifier: userIdentifier },
            } = testKit.session.getUserSession()
            const message: EventPayload = {
                uuid: randomUUID(),
                response: {
                    headers: testKit.session.getHeaders(),
                    userIdentifier,
                    integrityResultData: <HuaweiIntegrityResultData>{},
                },
            }

            jest.spyOn(huaweiIntegrityCheckServiceMock, 'onHuaweiIntegrityCheckComplete').mockResolvedValueOnce()

            expect(await integrityHuaweiDeviceEventListener.handler(message)).toBeUndefined()
            expect(huaweiIntegrityCheckServiceMock.onHuaweiIntegrityCheckComplete).toHaveBeenCalledWith(
                userIdentifier,
                message.response?.headers,
                message.response?.integrityResultData,
                message.error,
            )
        })
    })
})
