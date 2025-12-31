import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import * as Joi from 'joi'

import { EnvironmentType, LoggerLevel } from '@app/constants/common'
import { USER_QUEUE } from '@app/constants/user'
import { AsyncStatusCodeInterceptor, LoggingModule, RpcModule, TraceIdHttpModule } from '@app/infrastructure'
import { IUserService } from '@app/types/User'

import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/utils'
import { CallModule } from './call/call.module'
import { ChatModule } from './chat/chat.module'
import { MessageModule } from './message/message.module'
import { UserRpcModule } from './user/user-rpc.module'
import { UserModule } from './user/user.module'
import { JsonBodyMiddleware } from './utils/json-body.middleware'
import { getThrottlerConfig } from './utils/throttler.config'

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
        // Call Rate Limiting
        CALL_RATE_LIMIT_PER_MINUTE: Joi.number().optional().default(3),
        CALL_RATE_LIMIT_TO_USER_PER_MINUTE: Joi.number().optional().default(3),
        CALL_MAX_ACTIVE_CALLS: Joi.number().optional().default(1),
        CALL_REJECTED_COOLDOWN_SECONDS: Joi.number().optional().default(30),
        // Call Timeouts
        CALL_TIMEOUT_INITIATING_SECONDS: Joi.number().optional().default(30),
        CALL_TIMEOUT_RINGING_SECONDS: Joi.number().optional().default(60),
        CALL_TIMEOUT_CONNECTING_SECONDS: Joi.number().optional().default(120),
        CALL_TIMEOUT_ACTIVE_MINUTES: Joi.number().optional().default(60),
        // WebRTC Signal Security
        CALL_WEBRTC_SIGNAL_MAX_AGE_SECONDS: Joi.number().optional().default(30),
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
    // Rate limiting - защита от брутфорс атак и DoS
    ThrottlerModule.forRoot(getThrottlerConfig()),
    UserRpcModule,
    AuthModule,
    UserModule,
    MessageModule,
    ChatModule,
    CallModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Глобальный rate limiting guard
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
