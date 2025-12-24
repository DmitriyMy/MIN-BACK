import { IsUUID, IsNumber, IsInt, IsPositive, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { IGetMessagesByChatIdRequest } from '@app/types/Message'
import { ChatId } from '@app/types/Message'
import { UserId } from '@app/types/User'

export class GetMessagesByChatIdRequestDto implements IGetMessagesByChatIdRequest {
  @IsUUID()
  chatId: ChatId

  @IsUUID()
  userId: UserId

  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Max(1000)
  limit: number

  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsPositive()
  page: number
}
