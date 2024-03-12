import { randomUUID } from 'crypto'

import { mockInstance } from '@diia-inhouse/test'

import AcquirersOfferRequestHasDeletedEventListener from '@src/eventListeners/acquirersOfferRequestHasDeleted'

import AuthTokenService from '@services/authToken'

import { EventPayload } from '@interfaces/eventListeners/acquirersOfferRequestHasDeleted'

describe('AcquirersOfferRequestHasDeletedEventListener', () => {
    const authTokenServiceMock = mockInstance(AuthTokenService)
    const acquirersOfferRequestHasDeletedEventListener = new AcquirersOfferRequestHasDeletedEventListener(authTokenServiceMock)

    describe(`method: ${acquirersOfferRequestHasDeletedEventListener.handler.name}`, () => {
        it('should successfully invoke deletion procedure for entities by offer request hash id', async () => {
            const message: EventPayload = {
                offerRequestHashId: randomUUID(),
            }

            jest.spyOn(authTokenServiceMock, 'deleteEntitiesByOfferRequestHashId').mockResolvedValueOnce()

            expect(await acquirersOfferRequestHasDeletedEventListener.handler(message)).toBeUndefined()
            expect(authTokenServiceMock.deleteEntitiesByOfferRequestHashId).toHaveBeenCalledWith(message.offerRequestHashId)
        })
    })
})
