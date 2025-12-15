import { registerAs } from '@nestjs/config'
import { EnvironmentType } from '@app/constants/common'

export interface IAppConfig {
  nodeEnv: EnvironmentType
  loggerMinLevel: string
}

export const appConfig = registerAs(
  'app',
  (): IAppConfig => ({
    nodeEnv: process.env.NODE_ENV as EnvironmentType,
    loggerMinLevel: process.env.LOGGER_MIN_LEVEL,
  }),
)