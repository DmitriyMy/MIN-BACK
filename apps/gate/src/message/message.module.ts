import { Module } from '@nestjs/common'

import { MESSAGE_QUEUE } from '@app/constants/message'
import { RpcModule } from '@app/infrastructure'
import { IMessageService } from '@app/types/Message'

import { AuthModule } from '../auth/auth.module'
import { MessageController } from './controllers/message.controller'
import { MessageWebSocketGateway } from './controllers/message.websocket'

@Module({
  imports: [RpcModule.register({ name: IMessageService, queueName: MESSAGE_QUEUE }), AuthModule],
  controllers: [MessageController],
  providers: [MessageWebSocketGateway],
})
export class MessageModule {}
