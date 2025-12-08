import { Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Observable, of } from 'rxjs'
import { ErrorResponse } from '@app/types/Service'

@Catch(HttpException)
export class AsyncHttpExceptionFilter implements ExceptionFilter {
  private logger = new Logger('HttpExceptionFilter')

  catch(exception: HttpException): Observable<ErrorResponse> {
    const status: HttpStatus = exception.getStatus()
    const response = exception.getResponse()
    const message = typeof response === 'string' ? response : (response as Error).message

    this.logger.error({ status, error: message })

    if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
      return of({ status, error: [message] })
    }

    return of({
      status,
      error: ['Internal Server Error'],
      timestamp: new Date().toISOString(),
    })
  }
}
