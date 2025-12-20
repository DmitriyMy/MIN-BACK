import { NotImplementedException } from '@nestjs/common'
import { ChatType } from '@app/constants/chat'

import { UserId } from '@app/types/User'
import { IMessageDB } from './Message'
import { Response, ServiceResponse } from './Service'

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

/**
 * Request: Chat
 */
export interface IChatCreateRequest {
  creator: UserId
  type: ChatType
  message?: string
}

/**
 * Response: Chat
 */
export type IChatCreateResponse = Response<{ chat: IChatDB }>
export type SingleChatResponse = Response<{ chat: IChatDB }>

/**
 * Services
 */
export abstract class IChatService {
  /**
   * Chat
   */
  createChat(_request: IChatCreateRequest): ServiceResponse<IChatCreateResponse> {
    throw new NotImplementedException()
  }
}
