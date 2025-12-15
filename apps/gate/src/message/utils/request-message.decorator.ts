import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import { Request } from 'express'
import { IMessageDB } from '@app/types/Message'

export interface RequestWithMessage extends Request {
  message: IMessageDB
}

export const ReqMessage = createParamDecorator(
  (data: keyof IMessageDB | undefined, ctx: ExecutionContext): IMessageDB | IMessageDB[keyof IMessageDB] => {
    const request = ctx.switchToHttp().getRequest<RequestWithMessage>()
    const message = request.message as IMessageDB | undefined

    if (!message) {
      throw new UnauthorizedException()
    }

    return data ? message[data] : message
  },
)
