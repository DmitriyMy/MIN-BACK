import { Module } from '@nestjs/common'
import { Request, Response } from 'express'
import { ClsModule } from 'nestjs-cls'
import { v4 as uuidv4 } from 'uuid'

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req: Request, res: Response) => {
          const traceId = req.headers['x-request-id'] ?? uuidv4()
          cls.set('traceId', traceId)
          res.header('x-request-id', traceId)
        },
      },
    }),
  ],
})
export class TraceIdHttpModule {}
