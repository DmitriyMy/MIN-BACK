import { Module } from '@nestjs/common'

import { USER_QUEUE } from '@app/constants/user'
import { RpcModule } from '@app/infrastructure'
import { IUserService } from '@app/types/User'

import { UserController } from './controllers/user.controller'

@Module({
  imports: [RpcModule.register({ name: IUserService, queueName: USER_QUEUE })],
  controllers: [UserController],
})
export class UserModule {}
