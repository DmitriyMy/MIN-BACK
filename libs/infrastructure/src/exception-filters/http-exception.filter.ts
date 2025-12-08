import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { ErrorResponse } from '@app/types/Service'

interface HttpError {
  message: string
  error?: string
  statusCode: HttpStatus
}

const isErrorResponse = (res: object): res is ErrorResponse =>
  'status' in res && typeof res.status === 'number' && 'error' in res && Array.isArray(res.error)

const isHttpError = (res: object): res is HttpError =>
  'message' in res && typeof res.message === 'string' && 'statusCode' in res && typeof res.statusCode === 'number'

const isClassValidatorError = (res: object): res is HttpError =>
  'message' in res && Array.isArray(res.message) && 'statusCode' in res && typeof res.statusCode === 'number'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private logger = new Logger('HttpExceptionFilter')

  catch(exception: HttpException, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<Request>()
    const response = context.getResponse<Response>()

    const exceptionResponse = exception.getResponse()
    const status: HttpStatus = exception.getStatus()

    this.logger.error({ path: request.url, method: request.method, status, exceptionResponse })

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: ['Internal Server Error'] })
      return
    }

    if (typeof exceptionResponse === 'string') {
      response.status(status).send({ error: [exceptionResponse] })
      return
    }

    if (isErrorResponse(exceptionResponse)) {
      response.status(status).send({ error: exceptionResponse.error })
      return
    }

    if (isHttpError(exceptionResponse) && exceptionResponse.statusCode < HttpStatus.INTERNAL_SERVER_ERROR) {
      response.status(status).send({ error: [exceptionResponse.message] })
      return
    }

    if (isClassValidatorError(exceptionResponse) && exceptionResponse.statusCode < HttpStatus.INTERNAL_SERVER_ERROR) {
      response.status(status).send({ error: exceptionResponse.message })
      return
    }

    this.logger.error({ '[unhandled error]': { exceptionResponse } })

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: ['Unhandled Error'] })
  }
}
