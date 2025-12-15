import { NotImplementedException } from '@nestjs/common'
import { MessageStatus } from '@app/constants/message'

import { UserId } from '@app/types/User'
import { Response, ServiceResponse } from './Service'

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
  message: string
  messageStatus: MessageStatus
  createdAt: Date
}

export type IMessageCreateRequest = Pick<IMessageDB, 'chatId' | 'message'>

export type IMessageCreateResponse = Response<{ message: IMessageDB }>

export abstract class IMessageService {
  /**
   * Message
   */

  createMessage(_request: IMessageCreateRequest): ServiceResponse<IMessageCreateResponse> {
    throw new NotImplementedException()
  }
}
