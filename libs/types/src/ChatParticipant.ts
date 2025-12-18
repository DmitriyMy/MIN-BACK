import { ChatId } from '@app/types/Chat'
import { UserId } from '@app/types/User'

export interface IChatParticipantDB {
  chatId: ChatId
  userId: UserId
}
