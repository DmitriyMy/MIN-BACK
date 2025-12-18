import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { ChatId, IGetMessagesByChatRequest } from '@app/types/Message'
import { UserId } from '@app/types/User'

export class GetMessagesByChatIdRequestDto implements IGetMessagesByChatRequest {
  @IsString()
  chatId: ChatId

  @IsString()
  participant: UserId

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
