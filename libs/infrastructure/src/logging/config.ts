import '@nestjs/config'
import pino from 'pino'
import { PrettyOptions } from 'pino-pretty'
import { EnvironmentType } from '@app/constants/common'

export const getPinoConfig = (): Parameters<typeof pino>[0] => {
  const { NODE_ENV, LOGGER_MIN_LEVEL } = process.env
  return {
    level: LOGGER_MIN_LEVEL,
    transport:
      NODE_ENV === EnvironmentType.local
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'req',
            } as PrettyOptions,
          }
        : undefined,
  }
}
