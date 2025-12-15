import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import { Request } from 'express'
import { IUserDB } from '@app/types/User'

export const ReqUser = createParamDecorator(
  (data: keyof IUserDB | undefined, ctx: ExecutionContext): IUserDB | IUserDB[keyof IUserDB] => {
    const request = ctx.switchToHttp().getRequest<Request>()
    const user = request.user as IUserDB | undefined

    if (!user) {
      throw new UnauthorizedException()
    }

    return data ? user[data] : user
  },
)
