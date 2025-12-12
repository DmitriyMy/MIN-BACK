import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { messageStatus } from '@app/constants/message'
import { Messages } from '@app/entitiesPG'
import { IMessageCreateResponse, IMessageDB, IMessageService } from '@app/types/Message'

import { ServiceResponse } from '@app/types/Service'
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
      messageStatus: messageStatus.sent,
      createdAt: new Date(),
    })

    this.logger.debug({ '[createMessage]': { createMessage } })

    const message = await this.messageRepository.save(createMessage)

    await message.reload()

    this.logger.debug({ '[createMessage]': { updatedMessage: message } })

    return { data: { id: message.id }, status: HttpStatus.CREATED }
  }

  private static serialize(message: Messages): IMessageDB
  private static serialize(messages: Messages[]): IMessageDB[]
  private static serialize(messageOrMessages: Messages | Messages[]): IMessageDB | IMessageDB[] {
    return plainToInstance(Messages, instanceToPlain(messageOrMessages))
  }
}
