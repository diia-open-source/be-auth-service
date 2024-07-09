import { ApiError, ErrorData } from '@diia-inhouse/errors'

export class MongoDbApiError extends ApiError {
    keyValue: ErrorData | undefined

    constructor(message: string, code: number, data?: ErrorData) {
        super(message, code)
        this.name = 'MongoDbApiError'
        this.keyValue = data
    }
}
