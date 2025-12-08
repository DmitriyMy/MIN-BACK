import { inspect } from 'util'
import { Logger } from '@nestjs/common'
import { get, omit, set } from 'lodash'
import { LoggerLevel } from '@app/constants/common'

export function logDataWithArray<T extends object>({
  logger,
  loggerPrefix = '[logDataWithArray]',
  loggerLevel = LoggerLevel.debug,
  data,
  dataArrayPath = 'data.items',
  arrayItemsToShow = 5,
}: {
  logger: Logger
  loggerPrefix?: string
  loggerLevel?: LoggerLevel
  data: T
  dataArrayPath?: string
  arrayItemsToShow?: number
}): void {
  const dataForLog = omit(data, dataArrayPath)

  const responseArray = (get(data, dataArrayPath) as unknown[]).slice(0, arrayItemsToShow)
  const dataArrayPathAsArray = dataArrayPath.split('.')
  const responseArrayNewPathAsArray = [
    ...dataArrayPathAsArray.slice(0, -1),
    `${dataArrayPathAsArray.at(-1)}(first ${arrayItemsToShow})`,
  ]

  set(dataForLog, responseArrayNewPathAsArray, responseArray)

  logger[loggerLevel]({ [loggerPrefix]: dataForLog })
}

export function logError({
  logger,
  loggerPrefix = '[logDataWithArray]',
  loggerLevel = LoggerLevel.error,
  error = {},
}: {
  logger: Logger
  loggerPrefix?: string
  loggerLevel?: LoggerLevel
  error?: unknown
}): void {
  logger[loggerLevel]({ [loggerPrefix]: inspect(error) })
  logger[loggerLevel]([loggerPrefix], error)
}
