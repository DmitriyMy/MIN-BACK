import { chatStatus } from '@app/constants/chat'

import { UserId } from '@app/types/User'

export type chatId = string
export type id = string
export type senderId = UserId
/**
 * Entities
 */

export interface IChatDB {
    id: id
    chatId: chatId
    senderId: senderId
    text: string
    status: chatStatus
    createdAt: Date
}
