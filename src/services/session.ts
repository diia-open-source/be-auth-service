import { SessionByIdResponse } from '@generated/auth'

import { IdentifierService } from '@diia-inhouse/crypto'
import { BadRequestError, NotFoundError } from '@diia-inhouse/errors'
import { Logger, UserTokenData } from '@diia-inhouse/types'

import BankService from '@services/bank'
import RefreshTokenService from '@services/refreshToken'
import UserService from '@services/user'

import SessionDataMapper from '@dataMappers/sessionDataMapper'

import { RefreshTokenModel } from '@interfaces/models/refreshToken'
import { ProcessCode } from '@interfaces/services'
import { Session, SessionWithActions } from '@interfaces/services/session'
import { HistoryAction } from '@interfaces/services/user'

export default class SessionService {
    constructor(
        private readonly logger: Logger,
        private readonly identifier: IdentifierService,

        private readonly refreshTokenService: RefreshTokenService,
        private readonly sessionDataMapper: SessionDataMapper,
        private readonly bankService: BankService,
        private readonly userService: UserService,
    ) {}

    async getSessions(userIdentifier: string): Promise<Session[]> {
        const refreshTokens = await this.refreshTokenService.getUserTokensByUserIdentifier(userIdentifier)

        const sortedRefreshTokens = refreshTokens.sort((a, b) => {
            const aStatus = this.sessionDataMapper.getStatus(a)
            const bStatus = this.sessionDataMapper.getStatus(b)

            const lastActivityDateA = a.lastActivityDate
            const lastActivityDateB = b.lastActivityDate

            if (aStatus === bStatus && lastActivityDateA && lastActivityDateB) {
                return lastActivityDateB.getTime() - lastActivityDateA.getTime()
            }

            if (aStatus) {
                return -1
            }

            return 1
        })

        return await Promise.all(
            sortedRefreshTokens.map(async (refreshToken) => {
                const { authEntryPoint } = refreshToken

                const bank = authEntryPoint && authEntryPoint.bankName && (await this.bankService.getBankName(authEntryPoint.bankName))

                return this.sessionDataMapper.toEntity(refreshToken, bank)
            }),
        )
    }

    async getSessionById(id: string, userIdentifier: string): Promise<SessionByIdResponse> {
        const refreshToken = await this.getSessionRefreshToken(id, userIdentifier)
        const { platformType, platformVersion, appVersion } = refreshToken

        const result: SessionByIdResponse = {
            status: this.sessionDataMapper.getStatus(refreshToken),
            platformType: platformType!,
            platformVersion: platformVersion!,
            appVersion: appVersion!,
        }

        return result
    }

    async getUserSessionById(user: UserTokenData, id: string): Promise<SessionWithActions> {
        const { identifier: userIdentifier } = user
        const refreshToken = await this.getSessionRefreshToken(id, userIdentifier)
        const { authEntryPoint } = refreshToken

        const bank = authEntryPoint?.bankName && (await this.bankService.getBankName(authEntryPoint.bankName))
        const [{ count: sharingCount }, { count: signingCount }] = await Promise.all([
            this.userService.countHistoryByAction(HistoryAction.Sharing, id, user),
            this.userService.countHistoryByAction(HistoryAction.Signing, id, user),
        ])

        return this.sessionDataMapper.toEntityWithActions(refreshToken, sharingCount, signingCount, bank)
    }

    async getDeleteConfirmation(userIdentifier: string): Promise<ProcessCode> {
        const refreshTokensCount = await this.refreshTokenService.countUserTokensByUserIdentifier(userIdentifier)
        if (!refreshTokensCount) {
            throw new BadRequestError('No sessions to delete')
        }

        return refreshTokensCount === 1 ? ProcessCode.DeleteUserSessionConfirmation : ProcessCode.DeleteUserSessionsConfirmation
    }

    async deleteSessions(userIdentifier: string): Promise<void> {
        const refreshTokens = await this.refreshTokenService.getUserTokensByUserIdentifierToDelete(userIdentifier)
        if (!refreshTokens.length) {
            throw new BadRequestError('No sessions to delete')
        }

        const tasks = refreshTokens.map((refreshToken) => {
            const mobileUid = refreshToken.mobileUid

            if (!mobileUid) {
                this.logger.info('Cannot extract mobileUid from refreshToken while session deleting')

                return Promise.resolve()
            }

            return this.refreshTokenService.logoutUser(refreshToken, mobileUid, userIdentifier, refreshToken.sessionType)
        })

        await Promise.allSettled(tasks)
    }

    private async getSessionRefreshToken(id: string, userIdentifier: string): Promise<RefreshTokenModel> {
        const refreshTokens = await this.refreshTokenService.getUserTokensByUserIdentifier(userIdentifier)
        const refreshToken = refreshTokens.find(({ mobileUid }: RefreshTokenModel) => {
            if (!mobileUid) {
                return false
            }

            return this.identifier.createIdentifier(mobileUid) === id
        })

        if (!refreshToken) {
            throw new NotFoundError('Refresh token not found')
        }

        return refreshToken
    }
}
