interface SignedItem {
    name: string
    signature: string
}

export interface SignedData {
    signedItems: SignedItem[]
}
