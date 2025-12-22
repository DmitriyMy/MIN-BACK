import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ChatType } from '@app/constants/chat'
import { MessageStatus } from '@app/constants/message'
import { Chat, ChatParticipant } from '@app/entitiesPG'
import { ServiceResponse } from '@app/types/Service'
import { IChatService, ICreateChatRequest, CreateChatResponse } from '@app/types/Chat'

import { CreateChatRequestDto } from '../dto'
import { dataSourceName } from '../../config/postgresql.config'

@Injectable()
export class ChatService implements IChatService {
  private logger = new Logger(ChatService.name)

  @InjectRepository(Chat, dataSourceName)
  private readonly chatRepository: Repository<Chat>

  @InjectRepository(ChatParticipant, dataSourceName)
  private readonly chatParticipantRepository: Repository<ChatParticipant>

  public async createChat(params: CreateChatRequestDto): Promise<ServiceResponse<CreateChatResponse>> {
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
      chat.creator = creatorId
      chat.senderId = creatorId
      chat.type = type
      chat.message = description
        ? `Chat "${name}" created: ${description}`
        : `Chat "${name}" created`
      chat.messageStatus = MessageStatus.sent

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

      const chatResponse: CreateChatResponse = {
        id: savedChat.chatId,
        name,
        description,
        type: savedChat.type,
        participants,
        creator: creatorId,
        createdAt: savedChat.createdAt,
        status: HttpStatus.CREATED
      }

      return chatResponse

    } catch (error) {
      this.logger.error({ '[createChat] error': error })
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: ['Failed to create chat'],
        timestamp: new Date().toISOString()
      }
    }
  }
}