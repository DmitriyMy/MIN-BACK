import { INestApplicationContext, INestMicroservice, Type, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { AsyncAllExceptionsFilter } from '../exception-filters'
import { PinoLoggerService } from '../logging'
import { RemoveTraceIdPipe } from '../trace-id/remove-trace-id.pipe'

export async function bootstrapNatsMicroservice(
  rootModuleCls: Type<unknown>,
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
  })

  const logger = app.get(PinoLoggerService)
  app.useLogger(logger)

  // Удаляем __traceId из payload ПЕРЕД валидацией
  app.useGlobalPipes(
    new RemoveTraceIdPipe(),
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
