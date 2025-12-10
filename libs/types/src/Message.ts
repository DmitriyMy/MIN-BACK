import { NotImplementedException } from '@nestjs/common'
import { messageStatus } from '@app/constants/message'

import { Response, ServiceResponse } from '@app/types/Service'
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
  messageStatus: messageStatus
  createdAt: Date
}

export interface MessageCreateRequest {
  id: MessageId
  chatId: ChatId
  senderId: SenderId
  text: string
  messageStatus: messageStatus
}

export type MessageCreateResponse = Response<{ id: MessageId }>

export abstract class IMessageService {
  /**
   * Message
   */

  createMessage(_request: MessageCreateRequest): ServiceResponse<MessageCreateResponse> {
    throw new NotImplementedException()
  }
}
