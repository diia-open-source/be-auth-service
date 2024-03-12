import { UserActionArguments } from '@diia-inhouse/types'

export type CustomActionArguments = UserActionArguments

export type ActionResult = never | { success: true }
