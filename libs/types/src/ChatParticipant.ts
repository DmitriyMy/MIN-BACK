import { UserId } from '@app/types/User'
import { chatId } from '@app/types/Chat'

export type ChatID = chatId
export type UserID = UserId

export interface IChatParticipantDB  {
  chatId: ChatID
  userId: UserID
}
