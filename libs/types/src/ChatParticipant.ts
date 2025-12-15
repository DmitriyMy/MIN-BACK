import { chatId } from '@app/types/Chat'
import { UserId } from '@app/types/User'

export interface IChatParticipantDB {
  chatId: chatId
  userId: UserId
}
