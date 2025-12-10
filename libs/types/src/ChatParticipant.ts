import { chatId } from '@app/types/Chat'
import { UserId } from '@app/types/User'

export type ChatID = chatId
export type UserID = UserId

export interface IChatParticipantDB {
  chatId: ChatID
  userId: UserID
}
