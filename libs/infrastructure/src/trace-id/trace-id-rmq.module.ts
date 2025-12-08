import { ExecutionContext, Module } from '@nestjs/common'
import { ClsModule, ClsService, ClsStore } from 'nestjs-cls'
import { v4 as uuidv4 } from 'uuid'

export interface ClsStoreWithTraceId extends ClsStore {
  traceId: string
}

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      interceptor: {
        mount: true,
        setup: (cls: ClsService<ClsStoreWithTraceId>, context: ExecutionContext) => {
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
          const rpcContext = context.switchToRpc().getContext()

          const traceId = (rpcContext.getArgs()?.options?.headers?.traceId ?? uuidv4()) as string
          /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
          cls.set('traceId', traceId)
        },
      },
    }),
  ],
})
export class TraceIdRmqModule {}
