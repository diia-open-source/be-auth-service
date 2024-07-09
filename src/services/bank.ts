import { HttpService } from '@diia-inhouse/http'
import { RedlockService, StoreService } from '@diia-inhouse/redis'
import { Logger, OnInit } from '@diia-inhouse/types'

import FakeBankLoginService from '@services/fakeBankLogin'

import BankDataMapper from '@dataMappers/bankDataMapper'

import { AppConfig } from '@interfaces/config'
import { Bank, BankIdResponse, BankResponse, GetBanksParams } from '@interfaces/services/bank'

export default class BankService implements OnInit {
    constructor(
        private readonly config: AppConfig,
        private readonly logger: Logger,
        private readonly redlock: RedlockService,
        private readonly store: StoreService,
        private readonly httpsService: HttpService,

        private readonly fakeBankLoginService: FakeBankLoginService,
        private readonly bankDataMapper: BankDataMapper,
    ) {}

    async onInit(): Promise<void> {
        const lock = await this.redlock.lock('banks-init')

        try {
            const count: number = await this.countAllWorkable()
            if (!count) {
                this.logger.info('Banks are absent, start loading')
                await this.updateBanksList()
            }
        } finally {
            await lock.release()
        }
    }

    private readonly cacheKey: string = 'bank'

    private readonly bankIdPathBanksList: string = '/api/banks'

    private readonly bankIdHttpTimeout: number = 10 * 1000

    async updateBanksList(): Promise<void> {
        const banks = await this.receiveBanksFromBankId()
        if (!banks) {
            return
        }

        const bulkUpdateResult = await Promise.all(
            banks
                .filter(({ workable }: BankIdResponse) => Boolean(workable))
                .map((item) => {
                    const { id } = item
                    const bank = this.bankDataMapper.mapBankIdResponseItem(item)

                    return this.store.set(this.prepareCacheKey(id), JSON.stringify(bank))
                }),
        )

        this.logger.info('Banks updating bulk result', bulkUpdateResult)
    }

    async getBanks(headers: GetBanksParams): Promise<BankResponse[]> {
        const { platformType, appVersion } = headers
        const fakeData = await this.fakeBankLoginService.getFakeDataToApply(platformType, appVersion)
        const banks = fakeData ? [fakeData.bank] : await this.getAllWorkable()

        return banks.map((bank) => this.bankDataMapper.toEntity(bank))
    }

    async getBankName(bankId: string): Promise<string> {
        const bank = await this.fetchBankData(bankId)

        return bank?.name ?? ''
    }

    async getBankMemberId(bankId: string): Promise<string> {
        const bank = await this.fetchBankData(bankId)

        return bank?.memberId ?? ''
    }

    async isBankWorkable(bankId: string): Promise<boolean> {
        const bank = await this.fetchBankData(bankId)

        return bank?.workable ?? false
    }

    private async countAllWorkable(): Promise<number> {
        const allWorkable = await this.getAllWorkable()

        return allWorkable.length
    }

    private async getAllWorkable(): Promise<Bank[]> {
        const keys = await this.store.keys(`${this.cacheKey}.*`)
        if (keys.length === 0) {
            this.logger.error('Failed to find bank keys')

            return []
        }

        const banksJson = await this.store.mget(...keys)
        if (banksJson.length === 0) {
            this.logger.error('Failed to find banks by keys')

            return []
        }

        const banks: Bank[] = banksJson
            // eslint-disable-next-line unicorn/prefer-native-coercion-functions
            .filter((bank): bank is NonNullable<typeof bank> => Boolean(bank))
            .map((bankJson) => JSON.parse(bankJson))
            .filter((bank: Bank) => Boolean(bank.workable))
            .sort((bank: Bank, nextBank: Bank) => bank.sortOrder - nextBank.sortOrder)
        if (banks.length === 0) {
            this.logger.error('Failed to find workable banks in list', { banks })

            return []
        }

        return banks
    }

    private prepareCacheKey(id: string): string {
        return `${this.cacheKey}.${id}`
    }

    private async receiveBanksFromBankId(): Promise<BankIdResponse[] | undefined> {
        if (!this.config.bankId.host) {
            this.logger.error('Failed to get bank-id banks: unknown api host')

            return
        }

        const [err, response] = await this.httpsService.get({
            host: this.config.bankId.host,
            path: this.bankIdPathBanksList,
            timeout: this.bankIdHttpTimeout,
            rejectUnauthorized: this.config.bankId.rejectUnauthorized,
        })

        if (err) {
            this.logger.error('Failed to get bank-id banks', err)

            return
        }

        this.logger.debug('Bank list from BankID', response.data)

        return response.data
    }

    private async fetchBankData(bankId: string): Promise<Bank | null> {
        const bankJson = await this.store.get(this.prepareCacheKey(bankId))
        if (!bankJson) {
            this.logger.error(`Failed to find bank by bankId [${bankId}]`)

            return null
        }

        return JSON.parse(bankJson)
    }
}
