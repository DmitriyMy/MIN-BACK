import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { ChatId, IGetMessagesByChatRequest, SenderId } from '@app/types/Message'

export class GetMessagesByChatIdRequestDto implements IGetMessagesByChatRequest {
  @IsString()
  chatId: ChatId

  @IsString()
  senderId: SenderId

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  public limit?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  public page?: number
}
