// eslint-disable-next-line unicorn/no-static-only-class
class Utils {
    static extractAuthUrlRequestId(authUrl: string): string {
        const splittedAuthUrl = authUrl.split('/')
        const requestId = splittedAuthUrl.at(-1)
        if (!requestId) {
            throw new Error('Could not extract requestId from authUrl')
        }

        return requestId
    }

    static assertNotToBeUndefined<T>(param: T): asserts param is NonNullable<T> {
        // eslint-disable-next-line jest/no-standalone-expect
        expect(param).toBeDefined()
    }
}

export default Utils
