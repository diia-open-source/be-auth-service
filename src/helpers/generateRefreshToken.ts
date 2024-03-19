import { randomUUID } from 'crypto'

import { RefreshToken } from '@diia-inhouse/types'

export class GenerateRefreshTokenHelper {
    value: string

    readonly expirationTime: number

    constructor(lifetime: number, now: number = Date.now(), value: string = randomUUID()) {
        this.expirationTime = now + lifetime
        this.value = value
    }

    asPlain(): RefreshToken {
        return { value: this.value, expirationTime: this.expirationTime }
    }
}
