import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { MessageStatus } from '@app/constants/message'
import { ChatParticipant, Messages } from '@app/entitiesPG'
import { commonError } from '@app/errors'
import {
  IGetChatParticipantsRequest,
  IGetMessageRequest,
  IGetMessagesByChatIdRequest,
  IMessageCreateResponse,
  IMessageDB,
  IMessageService,
  IMessageUpdateRequest,
  IMessageUpdateResponse,
  IMessageUpdateStatusRequest,
  IMessageUpdateStatusResponse,
  MessagesListResponse,
  SingleMessageResponse,
} from '@app/types/Message'

import { ServiceResponse, Response } from '@app/types/Service'
import { UserId } from '@app/types/User'
import { getOffset } from '@app/utils/pagination'
import { dataSourceName } from '../../config/postgresql.config'
import * as DTO from '../dto'

@Injectable()
export class MessageService implements IMessageService {
  private logger = new Logger(MessageService.name)

  @InjectRepository(Messages, dataSourceName)
  private readonly messageRepository: Repository<Messages>

  @InjectRepository(ChatParticipant, dataSourceName)
  private readonly chatParticipantRepository: Repository<ChatParticipant>

  public async createMessage(params: DTO.MessageCreateRequestDto): ServiceResponse<IMessageCreateResponse> {
    this.logger.debug({ '[createMessage]': { params } })

    const createMessage = this.messageRepository.create({
      ...params,
      messageStatus: MessageStatus.sent,
      createdAt: new Date(),
    })

    this.logger.debug({ '[createMessage]': { createMessage } })

    const message = await this.messageRepository.save(createMessage)

    await message.reload()

    this.logger.debug({ '[createMessage]': { createMessage: message } })

    return { data: { message: MessageService.serialize(message) }, status: HttpStatus.CREATED }
  }

  public async getMessage(params: IGetMessageRequest): ServiceResponse<SingleMessageResponse> {
    this.logger.debug({ '[getMessage]': { params } })

    const message = await this.messageRepository.findOne({
      where: {
        messageId: params.messageId,
        senderId: params.senderId,
      },
    })

    if (!message) {
      throw new NotFoundException('Message not found')
    }

    this.logger.debug({ '[getMessage]': { message } })

    return {
      data: { message: MessageService.serialize(message) },
      status: HttpStatus.OK,
    }
  }

  public async getMessagesByChatId(params: IGetMessagesByChatIdRequest): ServiceResponse<MessagesListResponse> {
    this.logger.debug({ '[getMessagesByChatId]': { params } })

    const { chatId, userId, page, limit } = params

    // Проверяем, что пользователь является участником чата
    const participant = await this.chatParticipantRepository.findOne({
      where: {
        chatId,
        userId,
      },
    })

    if (!participant) {
      this.logger.warn({ '[getMessagesByChatId]': { error: 'User is not a participant', chatId, userId } })
      throw new NotFoundException(commonError.CHAT_NOT_FOUND)
    }

    const offset = getOffset(page, limit)

    const [messages, totalCount] = await this.messageRepository.findAndCount({
      where: {
        chatId,
      },
      order: {
        createdAt: 'DESC', // От самых последних к первым
      },
      take: limit,
      skip: offset,
    })

    this.logger.debug({ '[getMessagesByChatId]': { messagesCount: messages.length, totalCount } })

    // Переворачиваем массив, чтобы вернуть в правильном порядке (от старых к новым для отображения)
    const sortedMessages = messages.reverse()

    return {
      data: {
        messages: MessageService.serialize(sortedMessages) as IMessageDB[],
        count: totalCount,
      },
      status: HttpStatus.OK,
    }
  }

  public async updateMessage(params: IMessageUpdateRequest): ServiceResponse<IMessageUpdateResponse> {
    this.logger.debug({ '[updateMessage]': { params } })

    const existingMessage = await this.messageRepository.findOne({
      where: {
        messageId: params.messageId,
        senderId: params.senderId,
      },
    })

    if (!existingMessage) {
      throw new NotFoundException('Message not found or you are not the sender')
    }

    const updateData: Partial<Messages> = {
      updatedAt: new Date(),
    }

    if (params.message !== undefined) {
      updateData.message = params.message
    }

    if (params.messageStatus !== undefined) {
      updateData.messageStatus = params.messageStatus
    }

    await this.messageRepository.update({ messageId: params.messageId, senderId: params.senderId }, updateData)

    const updatedMessage = await this.messageRepository.findOne({
      where: { messageId: params.messageId },
    })

    if (!updatedMessage) {
      throw new NotFoundException('Message not found after update')
    }

    this.logger.debug({ '[updateMessage]': { updatedMessage } })

    return {
      data: { message: MessageService.serialize(updatedMessage) },
      status: HttpStatus.OK,
    }
  }

  public async updateMessageStatus(params: IMessageUpdateStatusRequest): ServiceResponse<IMessageUpdateStatusResponse> {
    this.logger.debug({ '[updateMessageStatus]': { params } })

    const existingMessage = await this.messageRepository.findOne({
      where: {
        messageId: params.messageId,
        senderId: params.senderId,
      },
    })

    if (!existingMessage) {
      throw new NotFoundException('Message not found or you are not the sender')
    }

    await this.messageRepository.update(
      { messageId: params.messageId, senderId: params.senderId },
      {
        messageStatus: params.messageStatus,
        updatedAt: new Date(),
      },
    )

    const updatedMessage = await this.messageRepository.findOne({
      where: { messageId: params.messageId },
    })

    if (!updatedMessage) {
      throw new NotFoundException('Message not found after status update')
    }

    this.logger.debug({ '[updateMessageStatus]': { updatedMessage } })

    return {
      data: { message: MessageService.serialize(updatedMessage) },
      status: HttpStatus.OK,
    }
  }

  public async getChatParticipants(
    params: IGetChatParticipantsRequest,
  ): ServiceResponse<Response<{ participants: UserId[] }>> {
    this.logger.debug({ '[getChatParticipants]': { params } })

    const { chatId, userId } = params

    // Проверяем, что пользователь является участником чата
    const participant = await this.chatParticipantRepository.findOne({
      where: {
        chatId,
        userId,
      },
    })

    if (!participant) {
      this.logger.warn({ '[getChatParticipants]': { error: 'User is not a participant', chatId, userId } })
      throw new NotFoundException(commonError.CHAT_NOT_FOUND)
    }

    const participants = await this.chatParticipantRepository.find({
      where: {
        chatId,
      },
      select: ['userId'],
    })

    const userIds = participants.map((p) => p.userId)

    this.logger.debug({ '[getChatParticipants]': { participantsCount: userIds.length } })

    return {
      data: { participants: userIds },
      status: HttpStatus.OK,
    }
  }

  private static serialize(message: Messages): IMessageDB
  private static serialize(messages: Messages[]): IMessageDB[]
  private static serialize(messageOrMessages: Messages | Messages[]): IMessageDB | IMessageDB[] {
    return plainToInstance(Messages, instanceToPlain(messageOrMessages))
  }
}
