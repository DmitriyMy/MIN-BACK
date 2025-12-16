import { NotImplementedException } from '@nestjs/common'
import { MessageStatus } from '@app/constants/message'

import { UserId } from '@app/types/User'
import { ISuccessResponse, Response, ServiceResponse } from './Service'

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
}

export interface IGetMessageRequest {
  messageId: MessageId
}

export interface IUpdateMessageRequest {
  message?: string
  messageId: MessageId
  senderId?: SenderId
  chatId?: ChatId
  messageStatus?: MessageStatus
}

export interface CreateMessageSuccessResponse extends ISuccessResponse {
  message: string
}

export type IMessageCreateRequest = Pick<IMessageDB, 'chatId' | 'message'>

export type IMessageCreateResponse = Response<{ message: IMessageDB }>

export type SingleMessageResponse = Response<{ message: IMessageDB }>

export abstract class IMessageService {
  /**
   * Message
   */
  getMessage(_request: IGetMessageRequest): ServiceResponse<SingleMessageResponse> {
    throw new NotImplementedException()
  }

  updateMessage(_request: IUpdateMessageRequest): ServiceResponse<SingleMessageResponse> {
    throw new NotImplementedException()
  }

  createMessage(_request: IMessageCreateRequest): ServiceResponse<IMessageCreateResponse> {
    throw new NotImplementedException()
  }
}
