import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import { Socket } from 'socket.io'
import { IUserDB } from '@app/types/User'

export const WsUser = createParamDecorator(
  (data: keyof IUserDB | undefined, ctx: ExecutionContext): IUserDB | IUserDB[keyof IUserDB] => {
    const client = ctx.switchToWs().getClient<Socket & { user?: IUserDB }>()
    const { user } = client

    if (!user) {
      throw new UnauthorizedException()
    }

    return data ? user[data] : user
  },
)

