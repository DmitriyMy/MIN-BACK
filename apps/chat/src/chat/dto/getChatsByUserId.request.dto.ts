import { IsUUID } from 'class-validator'
import { Type } from 'class-transformer'
import { IsNumber, IsInt, IsPositive, Max } from 'class-validator'
import { IGetChatsByUserIdRequest } from '@app/types/Chat'
import { UserId } from '@app/types/User'

export class GetChatsByUserIdRequestDto implements IGetChatsByUserIdRequest {
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
