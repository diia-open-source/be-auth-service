export enum ProcessCode {
    UserVerificationRequired = 10101000,
    NotAuthorized = 10101001,
    UserVerificationFailed = 10101002,
    NoAuthenticationMethodsAvailable = 10101003,
    UserIdentitySuccessfulConfirmation = 10101004,
    BankConfirmedAnotherPerson = 10101005,
    DocumentDoesNotBelongToUser = 10101006,

    SchemaProlongSuccess = 10101012,
    SchemaProlongFailed = 10101013,
    SchemaProlongStepSuccess = 10101015,

    UserAuthenticatedSuccessfully = 10201001,
    FailedVerifyUserIdentity = 10201002,
    UserIdentityNotVerified = 10201003,
    FailedVerifyUserIdentityV2 = 10201004,
    AuthBankSuccessWithPhoto = 10401002,
    AuthBankPhotoIdSuccess = 10401003,
    AuthBankSuccessWithoutPhoto = 10401004,
    AuthFailed = 10401005,
    AuthAttemptsExceeded = 10401006,
    WaitingPeriodHasExpired = 10401007,
    AuthNfcSuccess = 10401008,
    AuthQesSuccess = 10401009,
    VerifyAttemptsExceeded = 10401010,
    ResidencePermitAddedSuccessfully = 10501001,
    ResidencePermitInvalidData = 10501002,
    WaitingPeriodHasExpiredNfc = 10501003,
    ConfirmationDeleteOldDiiaId = 19101002,
    NoRequiredDocumentForDiiaId = 19101003,
    CreationIsPossibleOnlyWithBankingAuthorization = 19101015,
    DiiaIdCreationSteps = 19101016,
    UserBankingAuthSuccess = 19101017,
    UserIdentityStepNotVerified = 19101018,
    FailedVerifyUserIdentityStep = 19101019,
    UserNfcAuthSuccess = 19101020,
    UserPhotoIdAuthSuccess = 19101021,
    ConfirmationDeleteOldDiiaIdV2 = 19101022,
    UserBankindNfcAuthSuccess = 19101023,
    UserIsUnder14YearsOld = 19101024,
    DiiaIdCreationUserBankingAuthSuccess = 19101025,
    FailedVerifyUser = 19101027,
    DiiaIdExistsOnAnotherDevice = 19101028,
    DiiaIdCreationStepsV2 = 19101030,
    DiiaIdSigningPhotoIdSuccess = 19121003,
    DeleteUserSessionConfirmation = 22101001,
    DeleteUserSessionsConfirmation = 22101002,

    EResidentQrCodeSuccess = 10411001,
    EResidentQrCodeFail = 10411002,
    EResidentPhotoIdSuccess = 10411003,
    EResidentPhotoIdFail = 10411004,
    EResidentMrzSuccess = 10411005,
    EResidentAuthFail = 10411006,
    EResidentDiiaIdPhotoIdSuccess = 10411007,
    EResidentDocumentNotSupported = 10411008,
    EResidentApplicantAuthOtpFail = 10411009,
    EResidentApplicantOtpSuccess = 10411010,
    EResidentTerminated = 10411030,
    EResidentTerminationInProgress = 10411031,
}

export enum AnalyticsCategory {
    ResidencePermitNfcAdding = 'residence-permit-nfc-adding',
}

export enum AnalyticsActionType {
    MetaphoneCheck = 'metaphone-check',
}
