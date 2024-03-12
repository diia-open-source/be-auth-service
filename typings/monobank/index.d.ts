declare module 'monobank-api-client/src/Endpoint' {
    interface Endpoint {
        CURRENCY_LIST: string
        CLIENT_INFO: string
        ACCOUNT_STATEMENT: string
        PERSONAL_AUTH_REQUEST: string
    }

    const endpoint: Endpoint

    export = endpoint
}

declare class Signer {
    constructor(path: string)

    sign(data: string): string
}

declare module 'monobank-api-client/src/Signer' {
    export = Signer
}
