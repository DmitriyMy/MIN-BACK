import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import {
  IMessageCreateResponse,
  IMessageService,
  IMessageUpdateRequest,
  IMessageUpdateResponse,
  IMessageUpdateStatusRequest,
  IMessageUpdateStatusResponse,
} from '@app/types/Message'
import { ServiceResponse } from '@app/types/Service'

import * as DTO from '../dto'
import { MessageService } from '../services/message.service'

@Controller()
export class MessageController implements Pick<IMessageService, 'createMessage'> {
  private logger = new Logger(MessageController.name)

  @Inject(MessageService)
  private readonly messageService: MessageService

  @MessagePattern('messageCreate')
  public async createMessage(@Payload() payload: DTO.MessageCreateRequestDto): ServiceResponse<IMessageCreateResponse> {
    this.logger.debug({ '[messageCreate]': { payload } })
    const response = await this.messageService.createMessage(payload)
    this.logger.debug({ '[messageCreate]': { response } })
    return response
  }

  @MessagePattern('messageUpdate')
  public async updateMessage(@Payload() payload: IMessageUpdateRequest): ServiceResponse<IMessageUpdateResponse> {
    this.logger.debug({ '[messageUpdate]': { payload } })
    const response = await this.messageService.updateMessage(payload)
    this.logger.debug({ '[messageUpdate]': { response } })
    return response
  }

  @MessagePattern('messageUpdateStatus')
  public async updateMessageStatus(
    @Payload() payload: IMessageUpdateStatusRequest,
  ): ServiceResponse<IMessageUpdateStatusResponse> {
    this.logger.debug({ '[messageUpdateStatus]': { payload } })
    const response = await this.messageService.updateMessageStatus(payload)
    this.logger.debug({ '[messageUpdateStatus]': { response } })
    return response
  }
}
