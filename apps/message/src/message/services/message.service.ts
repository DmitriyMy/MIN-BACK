import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { MessageStatus } from '@app/constants/message'
import { Messages } from '@app/entitiesPG'
import {
  IGetMessageRequest,
  IMessageCreateResponse,
  IMessageDB,
  IMessageService,
  IMessageUpdateRequest,
  IMessageUpdateResponse,
  IMessageUpdateStatusRequest,
  IMessageUpdateStatusResponse,
  MultipleMessageResponse,
  SingleMessageResponse,
} from '@app/types/Message'

import { ServiceResponse } from '@app/types/Service'
import { getOffset } from '@app/utils/pagination'
import { dataSourceName } from '../../config/postgresql.config'
import * as DTO from '../dto'

@Injectable()
export class MessageService implements IMessageService {
  private logger = new Logger(MessageService.name)

  @InjectRepository(Messages, dataSourceName)
  private readonly messageRepository: Repository<Messages>

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

  public async getMessagesByChatId(
    params: DTO.GetMessagesByChatIdRequestDto,
  ): ServiceResponse<MultipleMessageResponse> {
    this.logger.debug({ '[getMessagesByChatId]': { params } })
    // Реализовать проверку для ChatParticipant

    const { chatId, limit = 20, page = 1 } = params

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { chatId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: getOffset(page, limit),
    })

    this.logger.debug({
      '[getMessagesByChatId]': {
        found: messages.length,
        total,
        limit,
        page,
      },
    })

    const serializedMessages = messages.map((msg) => MessageService.serialize(msg))

    return {
      data: {
        items: serializedMessages,
        count: total,
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

  private static serialize(message: Messages): IMessageDB
  private static serialize(messages: Messages[]): IMessageDB[]
  private static serialize(messageOrMessages: Messages | Messages[]): IMessageDB | IMessageDB[] {
    return plainToInstance(Messages, instanceToPlain(messageOrMessages))
  }
}
