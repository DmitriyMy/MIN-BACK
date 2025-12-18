import { Module } from '@nestjs/common'

import { USER_QUEUE } from '@app/constants/user'
import { RpcModule } from '@app/infrastructure'
import { IUserService } from '@app/types/User'

import { UserController } from './controllers/user.controller'
import { UserWebSocketGateway } from './controllers/user.websocket'

@Module({
  imports: [RpcModule.register({ name: IUserService, queueName: USER_QUEUE })],
  controllers: [UserController],
  providers: [UserWebSocketGateway],
})
export class UserModule {}
