import {HttpStatus, Injectable, Logger} from '@nestjs/common'
import {InjectRepository} from '@nestjs/typeorm'
import {instanceToPlain, plainToInstance} from 'class-transformer'
import {Repository} from 'typeorm'

import {Messages} from '@app/entitiesPG'
import {IMessageDB, IMessageService} from '@app/types/Message'

import {dataSourceName} from '../../config/postgresql.config'
import * as DTO from '../dto'
import {messageStatus} from "@app/constants/message";

@Injectable()
export class MessageService implements IMessageService {
  private logger = new Logger(MessageService.name)

  @InjectRepository(Messages, dataSourceName)
  private readonly messageRepository: Repository<Messages>

  public async createMessage(params: DTO.IMessageCreateRequestDto){
    this.logger.debug({ '[createMessage]': { params } })

    const { id } = params

    const createMessage = await this.messageRepository.create({
      ...params,
      messageStatus: messageStatus.sent,
      createdAt: new Date(),
    })

    this.logger.debug({ '[createMessage]': { createMessage } })

    const message = await this.messageRepository.save(createMessage)

    message.id = id

    await message.save()
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
