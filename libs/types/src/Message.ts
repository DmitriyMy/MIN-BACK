import { NotImplementedException } from '@nestjs/common'
import { MessageStatus } from '@app/constants/message'

import { UserId } from '@app/types/User'
import { ISuccessResponse, MultipleResponse, Response, ServiceResponse } from './Service'

export type ChatId = string
export type MessageId = string
export type SenderId = UserId
/**
 * Entities
 */

export interface IMessageDB {
  messageId: MessageId
  chatId: ChatId
  senderId: SenderId
  message: string
  messageStatus: MessageStatus
  createdAt: Date
  updatedAt: Date
}

export interface IGetMessageRequest {
  messageId: MessageId
  senderId: SenderId
}

export interface IGetMessagesByChatRequest {
  chatId: ChatId
  participant?: UserId
  limit: number
  page: number
}

export interface IMessageUpdateRequest {
  message: string
  messageId: MessageId
  senderId: SenderId
  messageStatus?: MessageStatus
}

export interface IMessageUpdateStatusRequest {
  messageId: MessageId
  senderId: SenderId
  messageStatus: MessageStatus
}

export interface IMessageCreateRequest {
  chatId: ChatId
  senderId: SenderId
  message: string
}

export interface CreateMessageSuccessResponse extends ISuccessResponse {
  message: string
}

export type MultipleMessageResponse = MultipleResponse<IMessageDB>

export type IMessageCreateResponse = Response<{ message: IMessageDB }>

export type IMessageUpdateResponse = Response<{ message: IMessageDB }>

export type IMessageUpdateStatusResponse = Response<{ message: IMessageDB }>

export type SingleMessageResponse = Response<{ message: IMessageDB }>

export abstract class IMessageService {
  /**
   * Message
   */
  getMessage(_request: IGetMessageRequest): ServiceResponse<SingleMessageResponse> {
    throw new NotImplementedException()
  }

  getMessagesByChatId(_request: IGetMessagesByChatRequest): ServiceResponse<MultipleMessageResponse> {
    throw new NotImplementedException()
  }

  updateMessage(_request: IMessageUpdateRequest): ServiceResponse<IMessageUpdateResponse> {
    throw new NotImplementedException()
  }

  updateMessageStatus(_request: IMessageUpdateStatusRequest): ServiceResponse<IMessageUpdateStatusResponse> {
    throw new NotImplementedException()
  }

  createMessage(_request: IMessageCreateRequest): ServiceResponse<IMessageCreateResponse> {
    throw new NotImplementedException()
  }
}
