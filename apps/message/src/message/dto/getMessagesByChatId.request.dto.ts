import { IsUUID } from 'class-validator'
import { IGetMessagesByChatIdRequest } from '@app/types/Message'
import { ChatId } from '@app/types/Message'

export class GetMessagesByChatIdRequestDto implements IGetMessagesByChatIdRequest {
  @IsUUID()
  chatId: ChatId
}

