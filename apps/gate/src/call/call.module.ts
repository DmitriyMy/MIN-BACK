import { Module } from '@nestjs/common'

import { CHAT_QUEUE } from '@app/constants/chat'
import { MESSAGE_QUEUE } from '@app/constants/message'
import { RpcModule } from '@app/infrastructure'
import { IChatService } from '@app/types/Chat'
import { IMessageService } from '@app/types/Message'

import { AuthModule } from '../auth/auth.module'
import { CallWebSocketGateway } from './controllers/call.websocket'
import { CallRateLimiterService } from './services/call-rate-limiter.service'
import { VpnConfigService } from './services/vpn-config.service'

@Module({
  imports: [
    AuthModule,
    RpcModule.register({ name: IChatService, queueName: CHAT_QUEUE }),
    RpcModule.register({ name: IMessageService, queueName: MESSAGE_QUEUE }),
  ],
  providers: [CallWebSocketGateway, VpnConfigService, CallRateLimiterService],
})
export class CallModule {}

