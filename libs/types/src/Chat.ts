import { ServiceResponse } from './Service'
import { ChatType } from '@app/constants/chat'

export type id = string
export type chatId = string
export type senderId = string

export interface IChatDB {
  id: id
  chatId: chatId
  senderId: senderId
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

export interface ISendMessageRequest {
  chatId: string
  senderId: string
  content: string
}

export interface IChatService {
  createChat(params: ICreateChatRequest): ServiceResponse<any>
  sendMessage(params: ISendMessageRequest): ServiceResponse<any>
}