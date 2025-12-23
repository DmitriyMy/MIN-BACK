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
          const args = rpcContext.getArgs()

          // Пытаемся получить trace-id из разных источников:
          // 1. Из headers контекста NATS (если переданы через опции)
          let traceId = args?.options?.headers?.traceId

          // 2. Из данных сообщения (поле __traceId добавляется в ClientNatsWithTraceId.send())
          // Примечание: __traceId будет удален RemoveTraceIdPipe до валидации
          if (!traceId && args && Array.isArray(args) && args.length > 0) {
            const payload = args[0]
            if (payload && typeof payload === 'object' && '__traceId' in payload) {
              traceId = (payload as { __traceId?: string }).__traceId
            }
          }

          // Если trace-id все еще не найден, генерируем новый UUID
          traceId = (traceId ?? uuidv4()) as string
          /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
          cls.set('traceId', traceId)
        },
      },
    }),
  ],
})
export class TraceIdRmqModule {}
