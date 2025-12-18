import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Chat, ChatParticipant } from '@app/entitiesPG'
import { ServiceResponse } from '@app/types/Service'
import { ChatType } from '@app/constants/chat'

import * as DTO from '../dto'
import { dataSourceName } from '../../config/postgresql.config'

@Injectable()
export class ChatService {
  private logger = new Logger(ChatService.name)

  @InjectRepository(Chat, dataSourceName)
  private readonly chatRepository: Repository<Chat>

  @InjectRepository(ChatParticipant, dataSourceName)
  private readonly chatParticipantRepository: Repository<ChatParticipant>

  public async createChat(params: DTO.CreateChatRequestDto): ServiceResponse<any> {
    this.logger.debug({ '[createChat]': { params } })

    const { name, participants, type = ChatType.PRIVATE } = params

    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const chatParticipants = participants.map(userId => {
      const participant = new ChatParticipant()
      participant.chatId = chatId
      participant.userId = userId
      return participant
    })

    await this.chatParticipantRepository.save(chatParticipants)

    const firstMessage = new Chat()
    firstMessage.chatId = chatId
    firstMessage.senderId = participants[0]
    firstMessage.creator = participants[0]
    firstMessage.type = type
    firstMessage.text = `Chat "${name}" created`
    firstMessage.status = 'sent'

    await this.chatRepository.save(firstMessage)

    this.logger.debug({ '[createChat]': { firstMessage } })

    return {
      data: {
        chat: {
          id: chatId,
          name,
          type,
          participants,
          createdAt: firstMessage.createdAt
        }
      },
      status: HttpStatus.CREATED
    }
  }

  public async sendMessage(params: DTO.SendMessageRequestDto): ServiceResponse<any> {
    this.logger.debug({ '[sendMessage]': { params } })

    const { chatId, senderId, content } = params

    const participant = await this.chatParticipantRepository.findOneBy({
      chatId,
      userId: senderId
    })

    this.logger.debug({ '[sendMessage]': { participant } })

    if (!participant) {
      throw new HttpException(
        'User is not a participant of this chat',
        HttpStatus.FORBIDDEN
      )
    }

    const message = new Chat()
    message.chatId = chatId
    message.senderId = senderId
    message.creator = senderId
    message.text = content
    message.type = ChatType.PRIVATE
    message.status = 'sent'

    await this.chatRepository.save(message)

    this.logger.debug({ '[sendMessage]': { message } })

    return {
      data: {
        message: {
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          text: message.text,
          status: message.status,
          createdAt: message.createdAt
        }
      },
      status: HttpStatus.OK
    }
  }

  public async getChatMessages(params: { chatId: string }): ServiceResponse<any> {
    this.logger.debug({ '[getChatMessages]': { params } })

    const { chatId } = params

    const messages = await this.chatRepository.find({
      where: { chatId },
      order: { createdAt: 'DESC' }
    })

    this.logger.debug({ '[getChatMessages]': { messages } })

    return {
      data: {
        messages: messages.map(msg => ({
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          text: msg.text,
          status: msg.status,
          createdAt: msg.createdAt
        }))
      },
      status: HttpStatus.OK
    }
  }
}