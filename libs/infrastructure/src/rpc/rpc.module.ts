import { DynamicModule, FactoryProvider, HttpStatus, InjectionToken, Logger, Module } from '@nestjs/common'
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices'
import { ClsService } from 'nestjs-cls'
import { firstValueFrom, timeout, retry, catchError, throwError, timer } from 'rxjs'

import { logError } from '@app/utils/logging'
import { ClientNatsWithTraceId } from './client-nats-with-trace-id'

// Кэш для переиспользования NATS клиентов
const clientsCache = new Map<string, ClientProxy>()

// Константы для конфигурации RPC
const RPC_TIMEOUT_MS = 5000 // 5 секунд
const RPC_RETRY_ATTEMPTS = 3
const RPC_RETRY_DELAY_MS = 1000 // 1 секунда между попытками

@Module({})
export class RpcModule {
  static register<T extends object>(options: { name: InjectionToken<T>; queueName: string }): DynamicModule {
    const serviceToken = options.name

    const serviceName = String((serviceToken as { name: string })?.name || serviceToken) || 'Untitled'

    const logger = new Logger(`"${serviceName}" RPC Service`)

    const getOrCreateClient = (queueName: string, traceIdGetter?: () => string | undefined): ClientProxy => {
      const cacheKey = `${queueName}-${process.env.NATS_URL}`

      let client = clientsCache.get(cacheKey) as ClientNatsWithTraceId | undefined

      if (!client) {
        const { NATS_URL } = process.env

        client = ClientProxyFactory.create({
          customClass: ClientNatsWithTraceId,
          options: {
            servers: [NATS_URL],
            queue: queueName,
          },
        }) as ClientNatsWithTraceId

        clientsCache.set(cacheKey, client)
        logger.debug(`Created and cached NATS client for queue: ${queueName}`)
      }

      // Устанавливаем trace-id getter для каждого запроса (trace-id может изменяться между запросами)
      if (traceIdGetter) {
        client.setTraceIdGetter(traceIdGetter)
      }

      return client
    }

    const serviceFactory: FactoryProvider<T> = {
      provide: serviceToken,
      inject: [ClsService],
      useFactory: (clsService: ClsService) => {
        // Создаем функцию для получения trace-id
        const getTraceId = (): string | undefined => {
          try {
            return clsService.get('traceId') as string | undefined
          } catch {
            // Если trace-id не установлен (например, вне HTTP контекста), возвращаем undefined
            return undefined
          }
        }

        const service = new Proxy({} as T, {
          has(_, methodName): boolean {
            return methodName !== 'then'
          },
          get(_, methodName: string): unknown {
            // Note: ignore lifecycle methods
            if (methodName === 'then') return service
            if (methodName === 'onModuleInit') return null
            if (methodName === 'onApplicationBootstrap') return null

            return async (payload: unknown) => {
              logger.debug({ [`[${methodName}]`]: { payload } })

              const natsClient = getOrCreateClient(options.queueName, getTraceId)

              try {
                // Trace-id будет добавлен в ClientNatsWithTraceId.send() через __traceId поле
                // На сервере оно будет извлечено в trace-id-rmq.module.ts до валидации
                const stream = natsClient.send(methodName, payload ?? {}).pipe(
                  timeout(RPC_TIMEOUT_MS),
                  retry({
                    count: RPC_RETRY_ATTEMPTS,
                    delay: (error, retryCount) => {
                      logger.debug({ [`[${methodName}]`]: { retryAttempt: retryCount, error } })
                      return timer(RPC_RETRY_DELAY_MS)
                    },
                  }),
                  catchError((error) => {
                    logError({ logger, loggerPrefix: `[${methodName}]`, error })
                    return throwError(() => error)
                  }),
                )

                const response: unknown = await firstValueFrom(stream)
                logger.debug({ [`[${methodName}]`]: { response } })
                return response
              } catch (error: unknown) {
                logError({ logger, loggerPrefix: `[${methodName}]`, error })

                // Проверяем, является ли ошибка таймаутом
                if (error && typeof error === 'object' && 'name' in error && error.name === 'TimeoutError') {
                  return {
                    status: HttpStatus.REQUEST_TIMEOUT,
                    error: [`RPC call timeout after ${RPC_TIMEOUT_MS}ms`],
                  }
                }

                return {
                  status: HttpStatus.SERVICE_UNAVAILABLE,
                  error: [String(error)],
                }
              }
            }
          },
        })

        return service
      },
    }

    return {
      module: RpcModule,
      providers: [serviceFactory],
      exports: [serviceFactory],
    }
  }
}
