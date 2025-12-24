import { NotImplementedException } from '@nestjs/common'
import { ChatType } from '@app/constants/chat'

import { UserId } from '@app/types/User'
import { PaginationRequest } from './Pagination'
import { IMessageDB } from './Message'
import { MultipleResponse, Response, ServiceResponse } from './Service'

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

export interface IGetChatsByUserIdRequest extends PaginationRequest {
  userId: UserId
}

/**
 * Response: Chat
 */
export type IChatCreateResponse = Response<{ chat: IChatDB }>
export type SingleChatResponse = Response<{ chat: IChatDB }>
export type ChatsListResponse = MultipleResponse<IChatDB>

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

  getChatsByUserId(_request: IGetChatsByUserIdRequest): ServiceResponse<ChatsListResponse> {
    throw new NotImplementedException()
  }
}
