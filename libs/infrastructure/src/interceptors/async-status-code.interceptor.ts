import { CallHandler, ExecutionContext, HttpStatus, NestInterceptor } from '@nestjs/common'
import { Response } from 'express'
import { Observable, map } from 'rxjs'

interface ResponseWithStatus {
  status: HttpStatus
  [key: string]: unknown
}

const isResponseWithStatus = (data: unknown): data is ResponseWithStatus =>
  typeof data === 'object' && data !== null && 'status' in data && typeof data.status === 'number'

export class AsyncStatusCodeInterceptor implements NestInterceptor {
  // Reason: need to implement expected specified interface
  // eslint-disable-next-line class-methods-use-this
  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const httpContext = context.switchToHttp()
    const response = httpContext.getResponse<Response>()

    return next.handle().pipe(
      map((data: unknown) => {
        if (isResponseWithStatus(data)) {
          response.status(data.status)
        }

        return data
      }),
    )
  }
}
