import { IsString } from 'class-validator'
import { ChatId, IMessageCreateRequest } from '@app/types/Message'

export class MessageCreateRequestDto implements IMessageCreateRequest {
  @IsString()
  chatId: ChatId

  @IsString()
  message: string
}
