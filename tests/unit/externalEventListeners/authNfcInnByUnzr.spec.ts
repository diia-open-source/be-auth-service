import AuthNfcInnByUnzr from '@src/externalEventListeners/authNfcInnByUnzr'

describe('AuthNfcInnByUnzr', () => {
    it('should be defined', () => {
        expect(AuthNfcInnByUnzr).toBeDefined()
    })

    it('should create instance', () => {
        expect(new AuthNfcInnByUnzr()).toBeInstanceOf(AuthNfcInnByUnzr)
    })
})
