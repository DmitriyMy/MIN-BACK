import { HttpStatus } from '@nestjs/common'
import { ServiceResponse, EmptyResponse } from './Service'
import { ChatType } from '@app/constants/chat'

export type ChatId = string
export type SenderId = string

export interface IChatDB {
  chatId: ChatId
  creator: string
  senderId: SenderId
  type: ChatType
  message: string
  messageStatus: number
  createdAt: Date
}

export interface ICreateChatRequest {
  name: string
  description?: string
  type?: ChatType
  participants: string[]
}

export interface CreateChatResponse extends EmptyResponse {
  id: string
  name: string
  description?: string
  type: ChatType
  participants: string[]
  creator: string
  createdAt: Date
}

export interface IChatService {
  createChat(params: ICreateChatRequest): Promise<ServiceResponse<CreateChatResponse>>
}
