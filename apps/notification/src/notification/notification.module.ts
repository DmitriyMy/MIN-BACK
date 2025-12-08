import { Module } from '@nestjs/common'
import { MailerModule } from '@nestjs-modules/mailer'
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { getMailConfig } from '../config/mail.config'

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getMailConfig,
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
