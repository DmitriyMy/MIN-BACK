import { IsEmail, IsNumber, IsString } from 'class-validator'
import { messageStatus } from '@app/constants/message'
import { ChatId, IMessageCreateRequest, MessageId, SenderId } from '@app/types/Message'

export class MessageCreateRequestDto implements IMessageCreateRequest {
  @IsNumber()
  public id: MessageId

  @IsNumber()
  public chatId: ChatId

  @IsEmail()
  public email: string

  @IsNumber()
  public senderId: SenderId

  @IsString()
  public text: string

  @IsString()
  public messageStatus: messageStatus.sent
}
