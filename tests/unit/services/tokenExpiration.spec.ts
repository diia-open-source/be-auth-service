import { DurationMs, DurationS, SessionType } from '@diia-inhouse/types'

import TokenExpirationService from '@services/tokenExpiration'

import { AppConfig } from '@interfaces/config'

describe(`${TokenExpirationService.name}`, () => {
    const config = <AppConfig>(<unknown>{
        auth: {
            cabinetTokenExpiresIn: DurationMs.Minute.toString(),
            jwt: {
                tokenSignOptions: {
                    expiresIn: DurationMs.Hour.toString(),
                },
            },
        },
    })

    const tokenExpirationService = new TokenExpirationService(config)

    describe('method: `getTokenExpirationInSecondsBySessionType`', () => {
        it(`should return ${DurationS.Minute}`, () => {
            expect(tokenExpirationService.getTokenExpirationInSecondsBySessionType(SessionType.CabinetUser)).toBe(DurationS.Minute)
        })

        it(`should return ${DurationS.Hour}`, () => {
            expect(tokenExpirationService.getTokenExpirationInSecondsBySessionType(SessionType.User)).toBe(DurationS.Hour)
        })
    })

    describe('method: `getTokenExpirationBySessionType`', () => {
        it('should return 2h', () => {
            const date = config.auth.cabinetTokenExpiresIn

            expect(tokenExpirationService.getTokenExpirationBySessionType(SessionType.CabinetUser)).toBe(date)
        })
    })

    describe('method: `revocationExpiration`', () => {
        it('should return revocation number with expiration', () => {
            const exp = DurationMs.Minute
            const date = Math.ceil((exp * 1000 - Date.now()) / 1000)

            expect(tokenExpirationService.revocationExpiration(SessionType.CabinetUser, exp)).toBe(date)
        })

        it('should return revocation number', () => {
            expect(tokenExpirationService.revocationExpiration(SessionType.CabinetUser)).toBe(DurationS.Minute)
        })
    })
})
