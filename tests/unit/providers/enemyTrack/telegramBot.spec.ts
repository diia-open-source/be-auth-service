import { randomUUID } from 'node:crypto'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { ServiceUnavailableError } from '@diia-inhouse/errors'
import { HttpService, HttpServiceResponse, HttpServiceResponseResult } from '@diia-inhouse/http'
import { mockInstance } from '@diia-inhouse/test'
import { HttpStatusCode } from '@diia-inhouse/types'

import EnemyTrackTelegramBotService from '@src/providers/enemyTrack/telegramBot'

import { AppConfig } from '@interfaces/config'

describe(`${EnemyTrackTelegramBotService.name}`, () => {
    const config = <AppConfig>{
        enemyTrack: { telegramBot: { host: 'telegram.bot.ua', authId: randomUUID() } },
        app: { integrationPointsTimeout: 30000 },
    }
    const loggerMock = mockInstance(DiiaLogger)
    const httpServiceMock = mockInstance(HttpService)
    const enemyTrackTelegramBotService = new EnemyTrackTelegramBotService(config, loggerMock, httpServiceMock)

    describe(`method: ${enemyTrackTelegramBotService.sendLink.name}`, () => {
        it('should successfully send link', async () => {
            const link = 'telegram.bot.link'
            const expectedPath = `/?action=getQRcode&link=${link}`
            const expectedData = { key: 'value' }

            jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce([null, { statusCode: HttpStatusCode.OK, data: expectedData }])

            expect(await enemyTrackTelegramBotService.sendLink(link)).toBeUndefined()
            expect(loggerMock.info).toHaveBeenCalledWith('Start calling enemy track telegram bot', {
                path: expectedPath,
            })
            expect(httpServiceMock.post).toHaveBeenCalledWith({
                host: config.enemyTrack.telegramBot.host,
                path: expectedPath,
                headers: {
                    'App-Auth-Id': config.enemyTrack.telegramBot.authId,
                },
                rejectUnauthorized: false,
                timeout: config.app.integrationPointsTimeout,
            })
        })

        it.each([
            [
                'error was received in response',
                <HttpServiceResponse>[new Error('Unable to send link'), undefined],
                <HttpServiceResponseResult>new Error('Unable to send link'),
            ],
            [
                'response status code is not OK',
                <HttpServiceResponse>[null, { statusCode: HttpStatusCode.BAD_REQUEST }],
                <HttpServiceResponseResult>{ statusCode: HttpStatusCode.BAD_REQUEST },
            ],
        ])(
            'should fail with error in case %s',
            async (_msg: string, expectedResponse: HttpServiceResponse, expectedErrorResponse: HttpServiceResponseResult) => {
                const link = 'telegram.bot.link'
                const expectedPath = `/?action=getQRcode&link=${link}`
                const errorMsg = 'Failed to make telegram bot api call'

                jest.spyOn(httpServiceMock, 'post').mockResolvedValueOnce(expectedResponse)

                await expect(async () => {
                    await enemyTrackTelegramBotService.sendLink(link)
                }).rejects.toEqual(new ServiceUnavailableError(errorMsg))

                expect(loggerMock.error).toHaveBeenCalledWith(errorMsg, expectedErrorResponse)
                expect(httpServiceMock.post).toHaveBeenCalledWith({
                    host: config.enemyTrack.telegramBot.host,
                    path: expectedPath,
                    headers: {
                        'App-Auth-Id': config.enemyTrack.telegramBot.authId,
                    },
                    rejectUnauthorized: false,
                    timeout: config.app.integrationPointsTimeout,
                })
            },
        )
    })
})
