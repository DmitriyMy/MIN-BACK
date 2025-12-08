import { Injectable, LoggerService } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'

import { Logger as PinoLogger, pino } from 'pino'
import { getPinoConfig } from './config'

@Injectable()
export class PinoLoggerService implements LoggerService {
  pino: PinoLogger

  constructor(private readonly cls?: ClsService) {
    this.pino = pino(getPinoConfig())
  }

  public error(message: unknown, trace?: string, context?: string): void {
    this.pino.error(this.getMessage(message, context))
    if (trace) {
      this.pino.error(this.getMessage(trace))
    }
  }

  public log(message: unknown, context?: string): void {
    this.pino.info(this.getMessage(message, context))
  }

  public debug(message: unknown, context?: string): void {
    this.pino.debug(this.getMessage(message, context))
  }

  public warn(message: unknown, context?: string): void {
    this.pino.warn(this.getMessage(message, context))
  }

  private getMessage(message: unknown, context?: string): { traceId: string; msg: unknown; context?: string } {
    const traceId: string = this.cls ? this.cls.get('traceId') : ''

    return {
      traceId,
      msg: message,
      context,
    }
  }
}
