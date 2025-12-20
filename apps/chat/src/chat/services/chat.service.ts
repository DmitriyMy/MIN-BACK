import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { instanceToPlain, plainToInstance } from 'class-transformer'

import { MessageStatus } from '@app/constants/message'
import { Chat, ChatParticipant } from '@app/entitiesPG'
import { IChatCreateResponse, IChatDB, IChatService } from '@app/types/Chat'
import { ServiceResponse } from '@app/types/Service'
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
      const chat = manager.create(Chat, {
        creator: params.creator,
        senderId: params.creator,
        type: params.type,
        message: params.message || '',
        messageStatus: MessageStatus.sent,
      })

      const savedChat = await manager.save(chat)
      this.logger.debug({ '[createChat]': { savedChat } })

      // 2. Создать участников чата в таблице chat_participants
      await manager.save(
        manager.create(ChatParticipant, {
          chatId: savedChat.chatId,
          userId: params.creator,
        }),
      )
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

  private static serialize(chat: Chat): IChatDB
  private static serialize(chats: Chat[]): IChatDB[]
  private static serialize(chatOrChats: Chat | Chat[]): IChatDB | IChatDB[] {
    return plainToInstance(Chat, instanceToPlain(chatOrChats))
  }
}
