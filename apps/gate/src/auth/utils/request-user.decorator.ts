import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import { Request } from 'express'
import { IUser } from '@app/types/User'

export const ReqUser = createParamDecorator(
  (data: keyof IUser | undefined, ctx: ExecutionContext): IUser | IUser[keyof IUser] => {
    const request = ctx.switchToHttp().getRequest<Request>()
    const user = request.user as IUser | undefined

    if (!user) {
      throw new UnauthorizedException()
    }

    return data ? user[data] : user
  },
)
