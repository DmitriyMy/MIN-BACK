import { DynamicModule, FactoryProvider, HttpStatus, InjectionToken, Logger, Module } from '@nestjs/common'
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

import { logError } from '@app/utils/logging'
import { ClientNatsWithTraceId } from './client-nats-with-trace-id'

@Module({})
export class RpcModule {
  static register<T extends object>(options: { name: InjectionToken<T>; queueName: string }): DynamicModule {
    const serviceToken = options.name

    const serviceName = String((serviceToken as { name: string })?.name || serviceToken) || 'Untitled'

    const logger = new Logger(`"${serviceName}" RPC Service`)

    let natsClient: ClientProxy

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

          const { NATS_URL } = process.env

          natsClient = ClientProxyFactory.create({
            customClass: ClientNatsWithTraceId,
            options: {
              servers: [NATS_URL],
              queue: options.queueName,
            },
          })

          try {
            const stream = natsClient.send(methodName, payload ?? {})
            const response: unknown = await firstValueFrom(stream)
            logger.debug({ [`[${methodName}]`]: { response } })
            return response
          } catch (error: unknown) {
            logError({ logger, loggerPrefix: `[${methodName}]`, error })
            return {
              status: HttpStatus.SERVICE_UNAVAILABLE,
              error: [String(error)],
            }
          }
        }
      },
    })

    const serviceFactory: FactoryProvider<T> = {
      provide: serviceToken,
      useFactory: () => {
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
