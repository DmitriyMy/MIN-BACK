import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CHAT_QUEUE } from '@app/constants/chat'
import { Chat, ChatParticipant } from '@app/entitiesPG'
import { RpcModule } from '@app/infrastructure'
import { IChatService } from '@app/types/Chat'

import { ChatController } from './controllers/chat.controller'
import { ChatService } from './services/chat.service'
import { dataSourceName } from '../config/postgresql.config'

@Module({
  imports: [
    RpcModule.register({ name: IChatService, queueName: CHAT_QUEUE }),
    TypeOrmModule.forFeature([Chat, ChatParticipant], dataSourceName),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}


