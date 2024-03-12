import EResidentAuthConfirmation from '@src/externalEventListeners/eResidentAuthConfirmation'

describe('eResidentAuthConfirmation', () => {
    it('should be defined', () => {
        expect(EResidentAuthConfirmation).toBeDefined()
    })

    it('should create instance', () => {
        expect(new EResidentAuthConfirmation()).toBeInstanceOf(EResidentAuthConfirmation)
    })
})
