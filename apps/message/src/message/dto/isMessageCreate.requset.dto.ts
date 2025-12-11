import { IsEmail } from 'class-validator'
import { messageStatus } from '@app/constants/message'
import { ChatId, IMessageCreateRequest, MessageId, SenderId } from '@app/types/Message'

export class MessageCreateRequestDto implements IMessageCreateRequest {
  public id: MessageId

  public chatId: ChatId

  @IsEmail()
  public email: string

  public senderId: SenderId

  public text: string

  public messageStatus: messageStatus.sent
}
