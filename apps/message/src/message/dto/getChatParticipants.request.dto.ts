import { IsUUID } from 'class-validator'
import { IGetChatParticipantsRequest, ChatId } from '@app/types/Message'
import { UserId } from '@app/types/User'

export class GetChatParticipantsRequestDto implements IGetChatParticipantsRequest {
  @IsUUID()
  chatId: ChatId

  @IsUUID()
  userId: UserId
}

