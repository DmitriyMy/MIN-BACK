import { ValidationPipe, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { CURRENT_VERSION, VERSION_HEADER } from '@app/constants/gate'
import { HttpExceptionFilter, PinoLoggerService } from '@app/infrastructure'

import { AppModule } from './app.module'
import { setupSwagger } from './helpers/swagger-builder'
import { SocketIoAdapter } from './utilsWs/socketIO.adapter'

async function bootstrap() {
  const { GATE_APP_PORT, SWAGGER_ENABLED } = process.env

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  })

  // Pino logger
  const logger = app.get(PinoLoggerService)
  app.useLogger(logger)

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      enableDebugMessages: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.enableVersioning({
    type: VersioningType.HEADER,
    header: VERSION_HEADER,
    defaultVersion: CURRENT_VERSION,
  })

  app.useGlobalFilters(new HttpExceptionFilter())

  app.useWebSocketAdapter(new SocketIoAdapter(app))

  if (SWAGGER_ENABLED === 'true') {
    setupSwagger(app)
  }

  await app.listen(GATE_APP_PORT)

  logger.log(`Application is listening http requests on ${await app.getUrl()}`)
}

void bootstrap()
