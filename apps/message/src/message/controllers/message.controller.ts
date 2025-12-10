import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import { IMessageService, MessageCreateResponse } from '@app/types/Message'
import { ServiceResponse } from '@app/types/Service'

import * as DTO from '../dto'
import { MessageService } from '../services/message.service'

@Controller()
export class MessageController implements Pick<IMessageService, 'createMessage'> {
  private logger = new Logger(MessageController.name)

  @Inject(MessageService)
  private readonly messageService: MessageService

  @MessagePattern('messageCreate')
  public async createMessage(@Payload() payload: DTO.IMessageCreateRequestDto): ServiceResponse<MessageCreateResponse> {
    this.logger.debug({ '[messageCreate]': { payload } })
    const response = await this.messageService.createMessage(payload)
    this.logger.debug({ '[messageCreate]': { response } })
    return response
  }
}
