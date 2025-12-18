import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import { Socket } from 'socket.io'
import { IUserDB } from '@app/types/User'

function wsUserDecoratorFactory(
  data: keyof IUserDB | undefined,
  ctx: ExecutionContext,
): IUserDB | IUserDB[keyof IUserDB] {
  const client = ctx.switchToWs().getClient<Socket & { user?: IUserDB }>()
  const { user } = client

  if (!user) {
    throw new UnauthorizedException()
  }

  return data ? user[data] : user
}

const wsUserDecoratorBase = createParamDecorator(wsUserDecoratorFactory)

export const WsUser = wsUserDecoratorBase as <T extends keyof IUserDB | undefined = undefined>(
  data?: T,
) => (target: unknown, propertyKey: string | symbol | undefined, parameterIndex: number) => void
