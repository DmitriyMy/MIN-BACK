import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import * as Joi from 'joi'

import { EnvironmentType, LoggerLevel } from '@app/constants/common'
import { USER_QUEUE } from '@app/constants/user'
import { AsyncStatusCodeInterceptor, LoggingModule, RpcModule, TraceIdHttpModule } from '@app/infrastructure'
import { IUserService } from '@app/types/User'

import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/utils'
import { CallModule } from './call/call.module'
import { MessageModule } from './message/message.module'
import { UserRpcModule } from './user/user-rpc.module'
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
        // MINIO_ENDPOINT: Joi.string().required(),
        // MINIO_PORT: Joi.number().required(),
        // ACCESS_KEY: Joi.string().required(),
        // SECRET_KEY: Joi.string().required(),
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('JWT_AUTH_EXPIRE')!
        return {
          secret: configService.get<string>('JWT_AUTH_SECRET')!,
          // @ts-expect-error - expiresIn is string but JwtModuleOptions expects StringValue, which is compatible
          signOptions: { expiresIn },
        }
      },
      inject: [ConfigService],
    }),
    RpcModule.register({ name: IUserService, queueName: USER_QUEUE }),
    TraceIdHttpModule,
    LoggingModule,
    UserRpcModule,
    AuthModule,
    UserModule,
    MessageModule,
    CallModule,
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
