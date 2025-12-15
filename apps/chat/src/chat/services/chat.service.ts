import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Chat, ChatParticipant } from '@app/entitiesPG'
import { commonError } from '@app/errors'
import { IChatService } from '@app/types/Chat'
import { ServiceResponse } from '@app/types/Service'
import { ChatType } from '@app/constants/chat'

import * as DTO from '../dto'
import { dataSourceName } from '../../config/postgresql.config'

@Injectable()
export class ChatService implements IChatService {
  private logger = new Logger(ChatService.name)

  @InjectRepository(Chat, dataSourceName)
  private readonly chatRepository: Repository<Chat>

  @InjectRepository(ChatParticipant, dataSourceName)
  private readonly chatParticipantRepository: Repository<ChatParticipant>

  public async createChat(params: DTO.CreateChatRequestDto): ServiceResponse<any> {
    this.logger.debug({ '[createChat]': { params } })

    const { participants, name, description, type } = params

    const firstMessage = this.chatRepository.create({
      chatId: 'new-chat-id',
      senderId: participants[0],
      type: type || ChatType.PRIVATE,
      text: `Chat "${name}" created`,
    })

    await this.chatRepository.save(firstMessage)

    if (participants && participants.length > 0) {
      const chatParticipants = participants.map(userId =>
        this.chatParticipantRepository.create({
          chatId: firstMessage.chatId, // Используем chatId из сообщения
          userId,
        })
      )
      await this.chatParticipantRepository.save(chatParticipants)
    }

    await firstMessage.reload()

    return {
      data: {
        chat: {
          id: firstMessage.chatId,
          name,
          description,
          type: firstMessage.type,
          createdAt: firstMessage.createdAt
        }
      },
      status: HttpStatus.CREATED
    }
  }

  public async sendMessage(params: DTO.SendMessageRequestDto): ServiceResponse<any> {
    this.logger.debug({ '[sendMessage]': { params } })

    const { chatId, senderId, content } = params

    const participant = await this.chatParticipantRepository.findOne({
      where: {
        chatId,
        userId: senderId
      }
    })

    if (!participant) {
      throw new HttpException('User is not a participant of this chat or chat does not exist', HttpStatus.FORBIDDEN)
    }

    const message = this.chatRepository.create({
      chatId,
      senderId,
      text: content,
      type: ChatType.PRIVATE,
    })

    await this.chatRepository.save(message)

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
}