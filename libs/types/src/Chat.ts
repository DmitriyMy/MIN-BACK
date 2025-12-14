import { ChatType } from '@app/constants/chat'

import { UserId } from '@app/types/User'
import { IMessageDB } from './Message'

export type ChatId = string
export type SenderId = UserId
/**
 * Entities
 */

export interface IChatDB extends Pick<IMessageDB, 'chatId' | 'senderId' | 'message' | 'messageStatus'> {
  creator: UserId
  type: ChatType
  createdAt: Date
}
