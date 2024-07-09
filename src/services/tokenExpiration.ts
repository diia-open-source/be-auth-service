import ms from 'ms'

import { SessionType } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'

export default class TokenExpirationService {
    private readonly expiresInBySession: Partial<Record<SessionType, string>>

    constructor(private readonly config: AppConfig) {
        this.expiresInBySession = {
            [SessionType.CabinetUser]: this.config.authService.cabinetTokenExpiresIn,
        }
    }

    getTokenExpirationInSecondsBySessionType(sessionType: SessionType): number {
        const expIn = this.expiresInBySession[sessionType] ?? this.config.auth.jwt.tokenSignOptions.expiresIn

        return Math.floor(ms(expIn) / 1000)
    }

    getTokenExpirationBySessionType(sessionType: SessionType): string | undefined {
        return this.expiresInBySession[sessionType]
    }

    revocationExpiration(sessionType: SessionType, tokenExp?: number): number {
        if (tokenExp) {
            return Math.ceil((tokenExp * 1000 - Date.now()) / 1000)
        }

        return this.getTokenExpirationInSecondsBySessionType(sessionType)
    }
}
