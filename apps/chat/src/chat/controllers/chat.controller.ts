import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import { IChatService } from '@app/types/Chat'
import { ServiceResponse } from '@app/types/Service'

import { ChatService } from '../services/chat.service'
import * as DTO from '../dto'

@Controller()
export class ChatController implements Pick<IChatService, 'createChat' | 'sendMessage'> {
  private logger = new Logger(ChatController.name)

  @Inject(ChatService)
  private readonly chatService: ChatService

  @MessagePattern('createChat')
  public async createChat(@Payload() payload: DTO.CreateChatRequestDto): ServiceResponse<any> {
    this.logger.debug({ '[createChat]': { payload } })
    const response = await this.chatService.createChat(payload)
    this.logger.debug({ '[createChat]': { response } })
    return response
  }

  @MessagePattern('sendMessage')
  public async sendMessage(@Payload() payload: DTO.SendMessageRequestDto): ServiceResponse<any> {
    this.logger.debug({ '[sendMessage]': { payload } })
    const response = await this.chatService.sendMessage(payload)
    this.logger.debug({ '[sendMessage]': { response } })
    return response
  }
}