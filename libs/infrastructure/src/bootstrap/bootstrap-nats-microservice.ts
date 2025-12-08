import { INestApplicationContext, INestMicroservice, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { AsyncAllExceptionsFilter } from '../exception-filters'
import { PinoLoggerService } from '../logging'

export async function bootstrapNatsMicroservice(
  rootModuleCls: unknown,
  queueName: string,
  callback?: (app: INestApplicationContext) => Promise<void> | void,
): Promise<INestMicroservice> {
  const { NATS_URL } = process.env

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(rootModuleCls, {
    transport: Transport.NATS,
    options: {
      servers: [NATS_URL],
      queue: queueName,
      queueOptions: {
        durable: true,
      },
    },
    bufferLogs: true,
  }).catch((reason: unknown) => {
    // eslint-disable-next-line no-console
    console.log('[error]', reason)
    throw reason
  })

  const logger = app.get(PinoLoggerService)
  app.useLogger(logger)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      enableDebugMessages: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
    }),
  )

  if (callback) {
    await callback(app)
  }

  app.useGlobalFilters(new AsyncAllExceptionsFilter())

  await app.listen()

  logger.log(`Application is listening "${queueName}" queue on "${NATS_URL}"`)

  return app
}
