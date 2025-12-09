import { messageStatus } from '@app/constants/message'

import { UserId } from '@app/types/User'

export type chatId = string
export type id = string
export type senderId = UserId
/**
 * Entities
 */

export interface IMessageDB {
    id: id
    chatId: chatId
    senderId: senderId
    text: string
    status: messageStatus
    phone: string
    createdAt: Date
}