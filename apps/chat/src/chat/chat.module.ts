import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Chat, ChatParticipant } from '@app/entitiesPG'

import { ChatController } from './controllers/chat.controller'
import { ChatService } from './services/chat.service'
import { dataSourceName } from '../config/postgresql.config'

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatParticipant], dataSourceName),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
