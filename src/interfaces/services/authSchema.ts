import { ActHeaders } from '@diia-inhouse/types'

import { FldConfigValues } from '@interfaces/models/authSchema'

export enum FaceLivenessDetectionVersion {
    V1 = '1.0',
    V2 = '2.0',
}

export type FaceLivenessDetectionConfigResponseValues = FldConfigValues & { version: string }

export interface FaceLivenessDetectionConfigResponse {
    version: FaceLivenessDetectionVersion
    config?: string
}

export type GetFldConfigHeadersParams = Required<Pick<ActHeaders, 'platformType' | 'appVersion'>>
