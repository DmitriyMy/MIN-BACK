import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ChatType } from '@app/constants/chat'
import { Chat, ChatParticipant } from '@app/entitiesPG'
import { ServiceResponse } from '@app/types/Service'
import { IChatService, ICreateChatRequest } from '@app/types/Chat'

import { CreateChatRequestDto } from '../dto'
import { dataSourceName } from '../../config/postgresql.config'

@Injectable()
export class ChatService implements IChatService {
  private logger = new Logger(ChatService.name)

  @InjectRepository(Chat, dataSourceName)
  private readonly chatRepository: Repository<Chat>

  @InjectRepository(ChatParticipant, dataSourceName)
  private readonly chatParticipantRepository: Repository<ChatParticipant>

  public async createChat(params: CreateChatRequestDto): Promise<ServiceResponse<any>> {
    this.logger.debug({ '[createChat]': { params } })

    const { name, description, participants, type = ChatType.PRIVATE } = params

    if (!participants || participants.length === 0) {
      throw new HttpException('Chat must have at least one participant', HttpStatus.BAD_REQUEST)
    }

    const creatorId = participants[0]
    if (!creatorId) {
      throw new HttpException('Creator ID is required', HttpStatus.BAD_REQUEST)
    }

    try {
      // Создаем чат
      const chat = new Chat()
      chat.chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      chat.creator = creatorId
      chat.senderId = creatorId
      chat.type = type
      chat.text = description
        ? `Chat "${name}" created: ${description}`
        : `Chat "${name}" created`
      chat.status = 'sent'

      const savedChat = await this.chatRepository.save(chat)
      this.logger.debug({ '[createChat] chat saved': { chatId: savedChat.chatId } })

      // Создаем участников
      const chatParticipants = participants.map(userId => {
        const participant = new ChatParticipant()
        participant.chatId = savedChat.chatId
        participant.userId = userId
        return participant
      })

      await this.chatParticipantRepository.save(chatParticipants)
      this.logger.debug({
        '[createChat] participants saved': {
          count: chatParticipants.length
        }
      })

      return {
        data: {
          chat: {
            id: savedChat.chatId,
            name,
            description,
            type,
            participants,
            creator: creatorId,
            createdAt: savedChat.createdAt
          }
        },
        status: HttpStatus.CREATED
      }

    } catch (error) {
      this.logger.error({ '[createChat] error': error })
      throw new HttpException('Failed to create chat', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}