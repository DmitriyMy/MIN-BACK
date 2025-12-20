import { IsString } from 'class-validator'
import { ChatId, IMessageCreateRequest, SenderId } from '@app/types/Message'

export class MessageCreateRequestDto implements IMessageCreateRequest {
  @IsString()
  chatId: ChatId

  @IsString()
  senderId: SenderId

  @IsString()
  message: string
}
