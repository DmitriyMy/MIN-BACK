import { IsUUID } from 'class-validator'
import { IAddUserToChatRequest } from '@app/types/Chat'
import { UserId } from '@app/types/User'

export class AddUserToChatRequestDto implements IAddUserToChatRequest {
  @IsUUID()
  chatId: string

  @IsUUID()
  userId: UserId
}

// Расширенный DTO для RPC с requesterId (внутренняя деталь реализации)
export class AddUserToChatRpcDto extends AddUserToChatRequestDto {
  @IsUUID()
  requesterId: UserId
}
