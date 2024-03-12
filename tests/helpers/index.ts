class Utils {
    static extractAuthUrlRequestId(authUrl: string): string {
        const splittedAuthUrl: string[] = authUrl.split('/')
        const requestId: string = splittedAuthUrl[splittedAuthUrl.length - 1]

        return requestId
    }

    static assertNotToBeUndefined<T>(param: T): asserts param is NonNullable<T> {
        // eslint-disable-next-line jest/no-standalone-expect
        expect(param).toBeDefined()
    }
}

export default Utils
