import { ObjectId } from 'bson'
import { v4 as uuid } from 'uuid'

import { AuthService } from '@diia-inhouse/crypto'
import { SessionType } from '@diia-inhouse/types'

import AcquirerLoginAction from '@actions/v1/acquirerLogin'

import DocumentAcquirersService from '@services/documentAcquirers'

import refreshTokenModel from '@models/refreshToken'

import UserSessionGenerator from '@tests/mocks/userSession'
import { getApp } from '@tests/utils/getApp'

describe(`Action ${AcquirerLoginAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let acquirerLoginAction: AcquirerLoginAction
    let documentAcquirersService: DocumentAcquirersService
    let auth: AuthService
    let userSessionGenerator: UserSessionGenerator

    beforeAll(async () => {
        app = await getApp()
        acquirerLoginAction = app.container.build(AcquirerLoginAction)
        documentAcquirersService = app.container.resolve('documentAcquirersService')
        userSessionGenerator = new UserSessionGenerator(app.container.resolve('identifier'))
        auth = app.container.resolve('auth')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should return token', async () => {
        const acquirerId: ObjectId = new ObjectId()

        jest.spyOn(documentAcquirersService, 'getAcquirerIdByToken').mockImplementationOnce(async () => acquirerId)
        const getJweInJwtSpy: jest.SpyInstance = jest.spyOn(auth, 'getJweInJwt')

        const { traceId, actionVersion } = userSessionGenerator.getHeaders()

        const acquirerToken: string = uuid()
        const { token } = await acquirerLoginAction.handler({
            params: { token: acquirerToken },
            headers: { traceId, actionVersion },
        })

        expect(token).toEqual(expect.any(String))
        expect(documentAcquirersService.getAcquirerIdByToken).toHaveBeenCalledTimes(1)
        expect(documentAcquirersService.getAcquirerIdByToken).toHaveBeenCalledWith(acquirerToken)
        expect(getJweInJwtSpy).toHaveBeenCalledTimes(1)
        expect(getJweInJwtSpy).toHaveBeenCalledWith({
            _id: acquirerId,
            refreshToken: {
                expirationTime: expect.any(String),
                value: expect.any(String),
            },
            sessionType: SessionType.Acquirer,
        })

        const refreshToken = await refreshTokenModel.findOneAndDelete({ eisTraceId: traceId })

        expect(refreshToken).toEqual(
            expect.objectContaining({
                eisTraceId: traceId,
                isDeleted: false,
                sessionType: SessionType.Acquirer,
            }),
        )
    })
})
