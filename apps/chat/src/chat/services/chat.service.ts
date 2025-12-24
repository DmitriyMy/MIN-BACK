import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { instanceToPlain, plainToInstance } from 'class-transformer'

import { ChatType } from '@app/constants/chat'
import { MessageStatus } from '@app/constants/message'
import { Chat, ChatParticipant } from '@app/entitiesPG'
import { commonError } from '@app/errors'
import {
  ChatsListResponse,
  IChatCreateResponse,
  IChatDB,
  IChatService,
  IAddUserToChatRequest,
  IAddUserToChatResponse,
  IGetChatsByUserIdRequest,
} from '@app/types/Chat'
import { ServiceResponse } from '@app/types/Service'
import { getOffset } from '@app/utils/pagination'
import { dataSourceName } from '../../config/postgresql.config'
import * as DTO from '../dto'

@Injectable()
export class ChatService implements IChatService {
  private logger = new Logger(ChatService.name)

  @InjectRepository(Chat, dataSourceName)
  private readonly chatRepository: Repository<Chat>

  @InjectRepository(ChatParticipant, dataSourceName)
  private readonly chatParticipantRepository: Repository<ChatParticipant>

  @InjectDataSource(dataSourceName)
  private readonly dataSource: DataSource

  public async createChat(params: DTO.ChatCreateRequestDto): ServiceResponse<IChatCreateResponse> {
    this.logger.debug({ '[createChat]': { params } })

    // Используем транзакцию для атомарности операций
    const result = await this.dataSource.transaction(async (manager) => {
      // 1. Создать запись в таблице chats
      // Для приватного чата senderId = creator (создатель чата является отправителем)
      const chat = manager.create(Chat, {
        creator: params.creator,
        senderId: params.creator, // Для приватного чата senderId = creator
        type: params.type,
        message: params.message || '',
        messageStatus: MessageStatus.sent,
      })

      const savedChat = await manager.save(chat)
      this.logger.debug({ '[createChat]': { savedChat } })

      // 2. Создать участников чата в таблице chat_participants
      // Для приватного чата участник: creator (создатель чата)
      // TODO: В будущем, когда будет добавлена логика выбора собеседника, нужно будет добавлять второго участника
      const participant = manager.create(ChatParticipant, {
        chatId: savedChat.chatId,
        userId: params.creator,
      })

      const savedParticipant = await manager.save(participant)
      this.logger.debug({ '[createChat]': { savedParticipant } })

      // Проверяем, что участник действительно сохранен
      const verifyParticipant = await manager.findOne(ChatParticipant, {
        where: {
          chatId: savedChat.chatId,
          userId: params.creator,
        },
      })

      if (!verifyParticipant) {
        this.logger.error({
          '[createChat]': { error: 'Failed to save participant', chatId: savedChat.chatId, userId: params.creator },
        })
        throw new Error('Failed to save chat participant')
      }

      this.logger.debug({ '[createChat]': { verifiedParticipant: verifyParticipant } })

      // Получаем обновленный чат через manager
      const updatedChat = await manager.findOne(Chat, {
        where: { chatId: savedChat.chatId },
      })

      if (!updatedChat) {
        throw new NotFoundException('Chat not found after creation')
      }

      return {
        data: { chat: ChatService.serialize(updatedChat) },
        status: HttpStatus.CREATED,
      }
    })

    this.logger.debug({ '[createChat]': { result } })
    return result
  }

  public async getChatsByUserId(params: IGetChatsByUserIdRequest): ServiceResponse<ChatsListResponse> {
    this.logger.debug({ '[getChatsByUserId]': { params } })

    const { userId, page, limit } = params
    const offset = getOffset(page, limit)

    // Получаем все chatId, где участвует пользователь
    const participantChatIds = await this.chatParticipantRepository.find({
      where: { userId },
      select: ['chatId'],
    })

    const chatIds = participantChatIds.map((p) => p.chatId)

    if (chatIds.length === 0) {
      return {
        data: { items: [], count: 0 },
        status: HttpStatus.OK,
      }
    }

    // Получаем чаты с пагинацией
    const [chats, totalCount] = await this.chatRepository.findAndCount({
      where: {
        chatId: In(chatIds),
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    })

    this.logger.debug({ '[getChatsByUserId]': { chatsCount: chats.length, totalCount } })

    return {
      data: {
        items: ChatService.serialize(chats) as IChatDB[],
        count: totalCount,
      },
      status: HttpStatus.OK,
    }
  }

  public async addUserToChat(params: DTO.AddUserToChatRpcDto): ServiceResponse<IAddUserToChatResponse> {
    this.logger.debug({ '[addUserToChat]': { params } })

    const { chatId, userId, requesterId } = params

    // Проверяем, что userId и requesterId переданы
    if (!userId || !requesterId) {
      this.logger.warn({ '[addUserToChat]': { error: 'Missing userId or requesterId', params } })
      throw new NotFoundException(commonError.CHAT_NOT_FOUND)
    }

    // Используем транзакцию для атомарности операций
    const result = await this.dataSource.transaction(async (manager) => {
      // 1. Проверяем существование чата
      const chat = await manager.findOne(Chat, {
        where: { chatId },
      })

      if (!chat) {
        this.logger.warn({ '[addUserToChat]': { error: 'Chat not found', chatId } })
        throw new NotFoundException(commonError.CHAT_NOT_FOUND)
      }

      // 2. Проверяем тип чата PRIVATE и количество участников (ранняя проверка)
      if (chat.type === ChatType.PRIVATE) {
        // Получаем текущее количество участников
        const participantsCount = await manager.count(ChatParticipant, {
          where: { chatId },
        })

        if (participantsCount >= 2) {
          this.logger.warn({
            '[addUserToChat]': {
              error: 'Private chat is full - cannot add more participants',
              chatId,
              participantsCount,
              chatType: chat.type,
            },
          })
          // Возвращаем 404 для безопасности - не раскрываем информацию о существовании чата
          throw new NotFoundException(commonError.CHAT_NOT_FOUND)
        }
      }

      // 3. Проверяем, не является ли пользователь уже участником
      const existingParticipant = await manager.findOne(ChatParticipant, {
        where: {
          chatId,
          userId,
        },
      })

      if (existingParticipant) {
        this.logger.warn({ '[addUserToChat]': { error: 'User already in chat', chatId, userId } })
        // Возвращаем 404 для безопасности - не раскрываем информацию о существовании чата
        throw new NotFoundException(commonError.CHAT_NOT_FOUND)
      }

      // 4. Проверяем права доступа
      if (userId !== requesterId) {
        // Пользователь пытается добавить другого пользователя
        // Requester должен быть участником чата
        const requesterParticipant = await manager.findOne(ChatParticipant, {
          where: {
            chatId,
            userId: requesterId,
          },
        })

        if (!requesterParticipant) {
          this.logger.warn({
            '[addUserToChat]': { error: 'Requester is not a participant', chatId, requesterId },
          })
          throw new NotFoundException(commonError.CHAT_NOT_FOUND)
        }
      } else {
        // Пользователь пытается присоединиться к чату сам (userId === requesterId)
        // Для PRIVATE чата: если пользователь не создатель, разрешаем присоединение только если там меньше 2 участников
        // (это уже проверено выше на шаге 2)
        // Для других типов чатов: разрешаем присоединение
        // Если пользователь создатель, он уже должен быть участником (проверено на шаге 3)

        if (chat.type === ChatType.PRIVATE && chat.creator !== requesterId) {
          // Для PRIVATE чата, если пользователь не создатель, разрешаем присоединение
          // (количество участников уже проверено выше - должно быть < 2)
          this.logger.debug({
            '[addUserToChat]': {
              message: 'User joining private chat as non-creator',
              chatId,
              userId,
              creator: chat.creator,
            },
          })
        }
      }

      // 5. Добавляем пользователя в чат
      const newParticipant = manager.create(ChatParticipant, {
        chatId,
        userId,
      })

      const savedParticipant = await manager.save(newParticipant)
      this.logger.debug({ '[addUserToChat]': { savedParticipant } })

      // Проверяем, что участник действительно сохранен
      const verifyParticipant = await manager.findOne(ChatParticipant, {
        where: {
          chatId,
          userId,
        },
      })

      if (!verifyParticipant) {
        this.logger.error({ '[addUserToChat]': { error: 'Failed to save participant', chatId, userId } })
        throw new Error('Failed to save chat participant')
      }

      this.logger.debug({ '[addUserToChat]': { verifiedParticipant: verifyParticipant } })

      return {
        data: { success: true },
        status: HttpStatus.OK,
      }
    })

    this.logger.debug({ '[addUserToChat]': { result } })
    return result
  }

  private static serialize(chat: Chat): IChatDB
  private static serialize(chats: Chat[]): IChatDB[]
  private static serialize(chatOrChats: Chat | Chat[]): IChatDB | IChatDB[] {
    return plainToInstance(Chat, instanceToPlain(chatOrChats))
  }
}
