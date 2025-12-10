import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MESSAGE_QUEUE } from '@app/constants/message'
import { Messages } from '@app/entitiesPG'
import { RpcModule } from '@app/infrastructure'
import { IMessageService } from '@app/types/Message'

import { MessageController } from './controllers/message.controller'
import { MessageService } from './services/message.service'
import { dataSourceName } from '../config/postgresql.config'

@Module({
  imports: [
    RpcModule.register({ name: IMessageService, queueName: MESSAGE_QUEUE }),
    TypeOrmModule.forFeature([Messages], dataSourceName),
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
