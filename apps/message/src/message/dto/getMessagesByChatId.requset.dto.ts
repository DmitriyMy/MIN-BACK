import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { ChatId, IGetMessagesByChatRequest } from '@app/types/Message'
import { UserId } from '@app/types/User'
export class GetMessagesByChatIdRequestDto implements IGetMessagesByChatRequest {
  @IsUUID()
  chatId: ChatId

  @IsOptional()
  @IsString()
  participant: UserId

  @IsNumber()
  @Min(1)
  @Max(50)
  public limit: number

  @IsNumber()
  @Min(1)
  public page: number
}
