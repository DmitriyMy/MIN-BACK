import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { UserController } from './controllers/user.controller'
import { UserWebSocketGateway } from './controllers/user.websocket'
import { UserRpcModule } from './user-rpc.module'

@Module({
  imports: [UserRpcModule, AuthModule],
  controllers: [UserController],
  providers: [UserWebSocketGateway],
})
export class UserModule {}
