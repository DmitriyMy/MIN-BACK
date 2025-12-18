import { Global, Module } from '@nestjs/common'

import { USER_QUEUE } from '@app/constants/user'
import { RpcModule } from '@app/infrastructure'
import { IUserService } from '@app/types/User'

const UserServiceRpc = RpcModule.register({ name: IUserService, queueName: USER_QUEUE })

@Global()
@Module({
  imports: [UserServiceRpc],
  exports: [UserServiceRpc],
})
export class UserRpcModule {}
