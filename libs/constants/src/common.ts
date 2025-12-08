import { isString } from 'lodash'

export enum EnvironmentType {
  local = 'local',
  dev = 'dev',
  staging = 'staging',
  prod = 'prod',
}

export enum LoggerLevel {
  debug = 'debug',
  verbose = 'verbose',
  log = 'log',
  warn = 'warn',
  error = 'error',
}

export const DraftСopyDate = '1970-01-01'

export const ToDate = new Date().toISOString().split('T')[0].toString()

export const toPositiveOrUndefined = (value: unknown): number | undefined => Number(value) || undefined

export const toPositiveOrNull = (value: unknown): number | null => Number(value) || null

export const arrayPositiveOrEmpty = (value: unknown): number[] | [] => {
  if (isString(value)) {
    return value.split(',').map((i: string) => Number.parseInt(i, 10))
  }
  return []
}

export const MIN_LENGTH = 3

export const MAX_LENGTH = 30
