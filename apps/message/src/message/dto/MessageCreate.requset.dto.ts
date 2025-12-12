import { IsNumber, IsString } from 'class-validator'
import { ChatId, IMessageCreateRequest } from '@app/types/Message'

export class MessageCreateRequestDto implements IMessageCreateRequest {
  @IsNumber()
  public chatId: ChatId

  @IsString()
  public text: string
}
