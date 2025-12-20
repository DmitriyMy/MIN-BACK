import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { CallWebSocketGateway } from './controllers/call.websocket'
import { VpnConfigService } from './services/vpn-config.service'

@Module({
  imports: [AuthModule],
  providers: [CallWebSocketGateway, VpnConfigService],
})
export class CallModule {}

