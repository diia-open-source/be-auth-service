import { randomUUID } from 'crypto'

const uuidv4 = jest.fn()
const current = new Date()
const randomUuid = randomUUID()

uuidv4.mockReturnValue(randomUuid)
jest.mock('uuid', () => ({ v4: uuidv4 }))
jest.useFakeTimers({ now: current })

import { GenerateRefreshTokenHelper } from '@src/helpers/generateRefreshToken'

describe(`${GenerateRefreshTokenHelper.name}`, () => {
    afterAll(() => {
        jest.useRealTimers()
    })

    describe('method: asPlain', () => {
        it.each([
            ['only lifespan is provided', new GenerateRefreshTokenHelper(60000), randomUuid, current.getTime() + 60000],
            [
                'only lifespan and now is provided',
                new GenerateRefreshTokenHelper(180000, current.getTime()),
                randomUuid,
                current.getTime() + 180000,
            ],
            [
                'all params are provided',
                new GenerateRefreshTokenHelper(100000, current.getTime(), '824defba-431b-11ee-be56-0242ac120002'),
                '824defba-431b-11ee-be56-0242ac120002',
                current.getTime() + 100000,
            ],
        ])(
            'should successfully generate refresh token when %s',
            (
                _msg: string,
                generateRefreshTokenHelper: GenerateRefreshTokenHelper,
                expectedValue: string,
                expectedExpirationTime: number,
            ) => {
                expect(generateRefreshTokenHelper.asPlain()).toEqual({ value: expectedValue, expirationTime: expectedExpirationTime })
            },
        )
    })
})
