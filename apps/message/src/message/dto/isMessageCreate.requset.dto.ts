import { messageStatus } from '@app/constants/message'
import { ChatId, MessageCreateRequest, MessageId, SenderId } from '@app/types/Message'

export class IMessageCreateRequestDto implements MessageCreateRequest {
  public id: MessageId

  public chatId: ChatId

  public senderId: SenderId

  public text: string

  public messageStatus: messageStatus.sent
}
