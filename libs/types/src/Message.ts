import { messageStatus } from '@app/constants/message'

import { UserId } from '@app/types/User'

export type ChatId = string
export type MessageId = string
export type SenderId = UserId
/**
 * Entities
 */

export interface IMessageDB {
  id: MessageId
  chatId: ChatId
  senderId: SenderId
  text: string
  status: messageStatus
  createdAt: Date
}
