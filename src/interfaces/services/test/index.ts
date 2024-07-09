import { Gender } from '@diia-inhouse/types'

export const testTarget = 'Test'

export interface ProvidedUserData {
    fName?: string
    lName?: string
    mName?: string
    birthDay?: string
    gender?: Gender
    document?: string
    addressOfRegistration?: string
    email?: string
}

export interface GetUserTokenOps {
    skipLogoutEvent?: boolean
}
