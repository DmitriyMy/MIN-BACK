import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import { IChatCreateResponse, IChatService } from '@app/types/Chat'
import { ServiceResponse } from '@app/types/Service'

import * as DTO from '../dto'
import { ChatService } from '../services/chat.service'

@Controller()
export class ChatController implements Pick<IChatService, 'createChat'> {
  private logger = new Logger(ChatController.name)

  @Inject(ChatService)
  private readonly chatService: ChatService

  @MessagePattern('chatCreate')
  public async createChat(@Payload() payload: DTO.ChatCreateRequestDto): ServiceResponse<IChatCreateResponse> {
    this.logger.debug({ '[chatCreate]': { payload } })
    const response = await this.chatService.createChat(payload)
    this.logger.debug({ '[chatCreate]': { response } })
    return response
  }
}

