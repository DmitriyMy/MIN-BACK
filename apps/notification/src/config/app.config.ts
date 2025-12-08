import { ConfigFactoryKeyHost, registerAs } from '@nestjs/config'
import { EnvironmentType } from '@app/constants/common'

export interface IAppConfig {
  nodeEnv: EnvironmentType
  loggerMinLevel: string
}

export const appConfig = (appName: string): (() => IAppConfig) & ConfigFactoryKeyHost<IAppConfig> =>
  registerAs(
    appName,
    (): IAppConfig => ({
      nodeEnv: process.env.NODE_ENV,
      loggerMinLevel: process.env.LOGGER_MIN_LEVEL,
    }),
  )
