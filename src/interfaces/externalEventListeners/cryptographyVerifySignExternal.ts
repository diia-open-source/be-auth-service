export interface VerifySignExternalRequest {
    data: string
    signature: string
}

export interface VerifySignExternalResponse<T> {
    ownerInfo: T
    timeInfo: Record<string, unknown>
}
