import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import * as Joi from 'joi'

import { EnvironmentType, LoggerLevel } from '@app/constants/common'
import { AsyncStatusCodeInterceptor, LoggingModule, TraceIdHttpModule } from '@app/infrastructure'

import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/utils'
import { UserModule } from './user/user.module'
import { JsonBodyMiddleware } from './utils/json-body.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`${process.env.NODE_ENV}.env`, '.env'],
      validationSchema: Joi.object({
        // App
        GATE_APP_HOST: Joi.string().required(),
        GATE_APP_PORT: Joi.number().required(),
        SWAGGER_ENABLED: Joi.boolean(),
        NODE_ENV: Joi.string()
          .required()
          .valid(...Object.values(EnvironmentType)),
        LOGGER_MIN_LEVEL: Joi.string()
          .required()
          .valid(...Object.values(LoggerLevel)),
        // NATS
        NATS_URL: Joi.string().required(),
        // JWT
        JWT_AUTH_EXPIRE: Joi.string().required(),
        JWT_AUTH_SECRET: Joi.string().required(),
        // MINIO
        MINIO_ENDPOINT: Joi.string().required(),
        MINIO_PORT: Joi.number().required(),
        ACCESS_KEY: Joi.string().required(),
        SECRET_KEY: Joi.string().required(),
      }),
    }),
    TraceIdHttpModule,
    LoggingModule,
    AuthModule,
    UserModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AsyncStatusCodeInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  // Reason: need to implement expected specified interface
  // eslint-disable-next-line class-methods-use-this
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(JsonBodyMiddleware).forRoutes('*')
  }
}
