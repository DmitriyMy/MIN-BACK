import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common'
import { BaseRpcExceptionFilter } from '@nestjs/microservices'
import { Observable, of } from 'rxjs'
import { ErrorResponse } from '@app/types/Service'
import { AsyncHttpExceptionFilter } from './async-http-exception.filter'

@Catch()
export class AsyncAllExceptionsFilter extends BaseRpcExceptionFilter {
  private asyncHttpExceptionFilter = new AsyncHttpExceptionFilter()

  catch(exception: unknown, host: ArgumentsHost): Observable<ErrorResponse> {
    if (exception instanceof HttpException) {
      return this.asyncHttpExceptionFilter.catch(exception)
    }

    super.catch(exception, host)

    return of({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: ['Unhandled Error'],
      timestamp: new Date().toISOString(),
    })
  }
}
