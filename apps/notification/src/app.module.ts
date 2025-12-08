import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi'
import { EnvironmentType, LoggerLevel } from '@app/constants/common'
import { LoggingModule, TraceIdRmqModule } from '@app/infrastructure'

import { appConfig } from './config/app.config'
import { NotificationModule } from './notification/notification.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig('notification')],
      isGlobal: true,
      envFilePath: [`${process.env.NODE_ENV}.env`, '.env'],
      validationSchema: Joi.object({
        // App
        NODE_ENV: Joi.string()
          .required()
          .valid(...Object.values(EnvironmentType)),
        LOGGER_MIN_LEVEL: Joi.string()
          .required()
          .valid(...Object.values(LoggerLevel)),
        // Nats
        NATS_URL: Joi.string().required(),
        // Notification
        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.number().required(),
        MAIL_USER: Joi.string().required(),
        MAIL_PASS: Joi.string().required(),
        MAIL_FROM_NAME: Joi.string().required(),
        MAIL_FROM_ADDRESS: Joi.string().required(),
      }),
    }),
    TraceIdRmqModule,
    LoggingModule,
    NotificationModule,
  ],
})
export class AppModule {}
