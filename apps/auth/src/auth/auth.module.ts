import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NOTIFICATION_QUEUE } from '@app/constants/notification'
import { User } from '@app/entitiesPG'
import { RpcModule } from '@app/infrastructure'
import { INotificationService } from '@app/types/Notification'

import { AuthController } from './controllers/auth.controller'
import { AuthService } from './services/auth.service'
import { dataSourceName } from '../config/postgresql.config'
import { VerificationModule } from '../verification/verification.module'

@Module({
  imports: [
    RpcModule.register({ name: INotificationService, queueName: NOTIFICATION_QUEUE }),
    TypeOrmModule.forFeature([User], dataSourceName),
    VerificationModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
