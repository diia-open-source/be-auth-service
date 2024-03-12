import { IdentifierService } from '@diia-inhouse/crypto'
import { UnauthorizedError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'

import Utils from '@src/utils'

import ValidateChannelUuidAction from '@actions/v1/validateChannelUuid'

describe(`Action ${ValidateChannelUuidAction.name}`, () => {
    const identifierService = new IdentifierService({ salt: 'salt' })
    const testKit = new TestKit()
    const appUtilsService = new Utils(identifierService)
    const validateChannelUuidAction = new ValidateChannelUuidAction(appUtilsService)

    describe('Method `handler`', () => {
        const headers = { ...testKit.session.getHeaders(), channelUuid: 'channelUuid' }
        const session = testKit.session.getUserSession()
        const args = { headers, session }

        it('should throw UnauthorizedError if channelUuid and generatedChannelUuid are different', async () => {
            const generatedChannelUuid = 'uuid'

            jest.spyOn(appUtilsService, 'generateChannelUuid').mockResolvedValueOnce(generatedChannelUuid)

            await expect(async () => {
                await validateChannelUuidAction.handler(args)
            }).rejects.toEqual(new UnauthorizedError())
        })

        it('should get success true', async () => {
            jest.spyOn(appUtilsService, 'generateChannelUuid').mockResolvedValueOnce(headers.channelUuid)

            expect(await validateChannelUuidAction.handler(args)).toMatchObject({ success: true })
            expect(appUtilsService.generateChannelUuid).toHaveBeenCalledWith(args.session.user.identifier)
        })
    })
})
