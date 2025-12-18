import { ServiceResponse } from './Service'
import { ChatType } from '@app/constants/chat'

export type ChatId = string
export type SenderId = string

export interface IChatDB {
  id: string
  chatId: ChatId
  creator: string
  senderId: SenderId
  type: ChatType
  text: string
  status: string
  createdAt: Date
}

export interface ICreateChatRequest {
  name: string
  description?: string
  type?: ChatType
  participants: string[]
}

export interface IChatService {
  createChat(params: ICreateChatRequest): Promise<ServiceResponse<any>>
}