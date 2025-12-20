import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'
import { ChatType } from '@app/constants/chat'
import { IChatCreateRequest, SenderId } from '@app/types/Chat'
import { UserId } from '@app/types/User'

export class ChatCreateRequestDto implements IChatCreateRequest {
  @IsUUID()
  creator: UserId

  @IsEnum(ChatType)
  type: ChatType

  @IsOptional()
  @IsString()
  message?: string
}
