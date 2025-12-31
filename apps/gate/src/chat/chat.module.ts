import { Module } from '@nestjs/common'

import { CHAT_QUEUE } from '@app/constants/chat'
import { RpcModule } from '@app/infrastructure'
import { IChatService } from '@app/types/Chat'

import { AuthModule } from '../auth/auth.module'
import { ChatController } from './controllers/chat.controller'

@Module({
  imports: [RpcModule.register({ name: IChatService, queueName: CHAT_QUEUE }), AuthModule],
  controllers: [ChatController],
})
export class ChatModule {}



