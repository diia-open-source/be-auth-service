import config from '@src/config'

export type AuthSchemaMap = Record<string, { tokenParamsCacheTtl: number; nonceCacheTtl?: number }>

export type AppConfig = Awaited<ReturnType<typeof config>>
