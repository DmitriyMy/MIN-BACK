import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as Joi from 'joi'
import { EnvironmentType, LoggerLevel } from '@app/constants/common'
import { LoggingModule, TraceIdRmqModule } from '@app/infrastructure'

import { AuthModule } from './auth/auth.module'
import { appConfig } from './config/app.config'
import { PostgresqlConfig, dataSourceName, postgresqlConfig } from './config/postgresql.config'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, postgresqlConfig],
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
        // PG
        PG_DB_HOST: Joi.string().required(),
        PG_DB_PORT: Joi.number().required(),
        PG_DB_USER: Joi.string().required(),
        PG_DB_NAME: Joi.string().required(),
        PG_DB_PASSWORD: Joi.string().required(),
        // NATS
        NATS_URL: Joi.string().required(),
        // Confirm Email
        JWT_EMAIL_EXPIRE: Joi.string().required(),
        JWT_EMAIL_SECRET: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: dataSourceName,
      useFactory: (configService: ConfigService) => configService.get<PostgresqlConfig>(dataSourceName)!,
      inject: [ConfigService],
    }),
    TraceIdRmqModule,
    LoggingModule,
    AuthModule,
  ],
})
export class AppModule {}
