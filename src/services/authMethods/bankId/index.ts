import { ParsedUrlQueryInput } from 'querystring'

import { randomUUID as uuid } from 'node:crypto'

import { BankIdCryptoServiceClient } from '@diia-inhouse/diia-crypto-client'
import { AccessDeniedError, BadRequestError, ServiceUnavailableError, UnauthorizedError } from '@diia-inhouse/errors'
import { HttpService, HttpServiceResponse } from '@diia-inhouse/http'
import { Logger } from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import BankService from '@services/bank'
import BankIdAuthRequestService from '@services/bankIdAuthRequest'
import FakeBankLoginService from '@services/fakeBankLogin'

import { AppConfig } from '@interfaces/config'
import { AuthMethod } from '@interfaces/models/authSchema'
import { AuthMethodVerifyParams, AuthProviderHeaders, AuthUrlOps } from '@interfaces/services/auth'
import { AuthProviderFactory } from '@interfaces/services/authMethods'
import { BankIdDocumentType, BankIdUser } from '@interfaces/services/authMethods/bankId'
import { BankIdVersion } from '@interfaces/services/bank'

export default class BankIdProvider implements AuthProviderFactory {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly httpsService: HttpService,

        private readonly bankService: BankService,
        private readonly bankIdAuthRequestService: BankIdAuthRequestService,
        private readonly fakeBankLoginService: FakeBankLoginService,
        private readonly bankIdCryptoServiceClient: BankIdCryptoServiceClient,
    ) {}

    async requestAuthorizationUrl({ bankId }: AuthUrlOps, headers: AuthProviderHeaders): Promise<string> {
        const { mobileUid, platformType, appVersion } = headers

        if (!bankId) {
            throw new BadRequestError(`BankId is required field for ${AuthMethod.BankId} auth method`)
        }

        const fakeData = await this.fakeBankLoginService.getFakeDataToApply(platformType, appVersion)
        if (!fakeData && !(await this.bankService.isBankWorkable(bankId))) {
            throw new BadRequestError(`Provided bankId ${bankId} is not workable`)
        }

        await this.bankIdAuthRequestService.createRequest(mobileUid, bankId)
        if (fakeData) {
            return fakeData.authorizationUrl
        }

        return this.getAuthUrl(bankId)
    }

    async verify(requestId: string, { bankId, headers }: AuthMethodVerifyParams): Promise<BankIdUser> {
        const { platformType, appVersion } = headers
        const fakeData = await this.fakeBankLoginService.getFakeDataToApply(platformType, appVersion)
        if (fakeData && fakeData.requestId === requestId) {
            return fakeData.bankIdUser
        }

        const [token, memberId]: [string, string] = await Promise.all([
            this.getAccessTokenFromBankId(requestId),
            this.bankService.getBankMemberId(bankId!),
        ])

        return await this.getUserFromBankId(token, memberId)
    }

    private getAuthUrl(bankId: string): string {
        const { bankId: bankIdConfig } = this.config
        const host = bankIdConfig.host
        const path = bankIdConfig.authPath
        const clientId = bankIdConfig.clientId
        const state = uuid()

        const { bankIdVersion, datasetInUse } = this.config.bankId
        const baseUrl = `https://${host}${path}?response_type=code&client_id=${clientId}&state=${state}&bank_id=${bankId}`
        switch (bankIdVersion) {
            case BankIdVersion.V1:
                return baseUrl
            case BankIdVersion.V2:
                return `${baseUrl}&dataset=${datasetInUse}`
            default: {
                const unhandledBankIdVersion: never = bankIdVersion

                throw new TypeError(`Unhandled bank id version type: ${unhandledBankIdVersion}`)
            }
        }
    }

    private async getAccessTokenFromBankId(code: string): Promise<string> {
        this.logger.info('Start getting access token using authorization code', { code })

        const [error, result]: HttpServiceResponse = await this.makeTokenApiCall(code)

        if (error || !result.data) {
            const err: { error: string } = error && error.data ? error.data : error?.toString()

            this.logger.error('Error: Getting access token', err)

            this.handleError(err)
        }

        // const data: {
        //     token_type: string;
        //     access_token: string;
        //     expires_in: number;
        //     refresh_token: string;
        // } = result.data;

        const { data } = result

        this.logger.debug('Getting access token result', data)

        return data.access_token
    }

    private async getUserFromBankId(token: string, memberId: string): Promise<BankIdUser> {
        this.logger.info('Start getting user by access token')

        const [error, result]: HttpServiceResponse = await this.makeUserApiCall(token)
        if (error || !result.data) {
            const err: { error: string } = error?.data ? error.data : error?.toString()

            this.logger.error('Error: Getting user', err)

            this.handleError(err)
        }

        if (result.data && result.data.error) {
            this.logger.error('Error: Getting user', result.data)

            this.handleError(result.data)
        }

        const encryptedUser: { state: string; cert: string; customerCrypto: string; memberId: string } = result.data
        if (this.config.bankId.verifyMemberId && memberId !== encryptedUser.memberId) {
            this.logger.error('Mismatched memberId while getting user', { memberId, expectedMemberId: encryptedUser.memberId })

            throw new AccessDeniedError()
        }

        const user: BankIdUser = await this.decryptBankIdResponse(encryptedUser)

        this.logger.debug('Successfully received user from BankId', user)

        return user
    }

    private async decryptBankIdResponse(encryptedUser: { state: string; cert: string; customerCrypto: string }): Promise<BankIdUser> {
        this.logger.debug('Start to decrypt response from BankId', encryptedUser)

        try {
            const { data } = await this.bankIdCryptoServiceClient.decrypt(encryptedUser)

            return JSON.parse(data)
        } catch (e) {
            return utils.handleError(e, (err) => {
                this.logger.error('Error when decrypting response from BankId', { err })

                throw new UnauthorizedError()
            })
        }
    }

    private handleError(err: { error: string }): never {
        if (!err.error) {
            throw new UnauthorizedError()
        }

        switch (err.error) {
            case 'invalid_request':
            case 'invalid_cert':
            case 'invalid_data':
            case 'unauthorized_client':
            case 'invalid_token':
            case 'invalid_grant':
                throw new UnauthorizedError()
            case 'access_denied':
                // ODO: add in diia-app new error
                // throw new ForbiddenException();
                throw new UnauthorizedError()
            case 'temporarily_unavailable':
                throw new ServiceUnavailableError()
            default:
                throw new UnauthorizedError()
        }
    }

    private async makeTokenApiCall(code: string): Promise<HttpServiceResponse> {
        const bodyDataString: Record<string, unknown> = {
            code,
            grant_type: 'authorization_code',
            client_id: this.config.bankId.clientId,
            client_secret: this.config.bankId.clientSecret,
        }

        return await this.httpsService.post(
            {
                host: this.config.bankId.host,
                path: this.config.bankId.tokenPath,
                timeout: this.config.app.integrationPointsTimeout,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
            undefined,
            <ParsedUrlQueryInput>bodyDataString,
        )
    }

    private async makeUserApiCall(token: string): Promise<HttpServiceResponse> {
        let cert: string

        try {
            const { cert: certResult } = await this.bankIdCryptoServiceClient.generateCertificate({})

            cert = certResult
        } catch (e) {
            return utils.handleError(e, (err) => {
                this.logger.error('BankId: Certificate generation error', { err })

                throw new Error('BankId: Certificate generation error')
            })
        }

        let clientPayload: string

        const bankIdVersion = this.config.bankId.bankIdVersion
        switch (bankIdVersion) {
            case BankIdVersion.V1:
                clientPayload = JSON.stringify({
                    type: 'physical',
                    cert,
                    fields: ['firstName', 'middleName', 'lastName', 'phone', 'inn', 'birthDay', 'sex', 'email'],
                    addresses: [
                        { type: 'juridical', fields: ['country', 'state', 'area', 'city', 'street', 'houseNo', 'flatNo'] },
                        { type: 'factual', fields: ['country', 'state', 'area', 'city', 'street', 'houseNo', 'flatNo'] },
                    ],
                    documents: [
                        {
                            type: BankIdDocumentType.Passport,
                            fields: ['typeName', 'series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
                        },
                        {
                            type: BankIdDocumentType.IdPassport,
                            fields: ['typeName', 'series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
                        },
                        {
                            type: BankIdDocumentType.ForeignPassport,
                            fields: ['typeName', 'series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
                        },
                        {
                            type: BankIdDocumentType.Ident,
                            fields: ['typeName', 'series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
                        },
                    ],
                })
                break
            case BankIdVersion.V2:
                clientPayload = JSON.stringify({ cert })
                break
            default: {
                const unhandledBankIdVersion: never = bankIdVersion

                throw new TypeError(`Unhandled bank id version type: ${unhandledBankIdVersion}`)
            }
        }

        const resp = await this.httpsService.post(
            {
                host: this.config.bankId.host,
                path: this.config.bankId.userPath,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                rejectUnauthorized: false,
                timeout: this.config.app.integrationPointsTimeout,
            },
            undefined,
            clientPayload,
        )

        return resp
    }
}
