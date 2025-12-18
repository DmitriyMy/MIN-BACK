import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { ServiceResponse } from '@app/types/Service'

import { ChatService } from '../services/chat.service'
import * as DTO from '../dto'

@Controller()
export class ChatController {
  private logger = new Logger(ChatController.name)

  constructor(
    private readonly chatService: ChatService
  ) {}

  @MessagePattern('createChat')
  public async createChat(@Payload() payload: DTO.CreateChatRequestDto): Promise<ServiceResponse<any>> {
    this.logger.debug({ '[createChat]': { payload } })
    return await this.chatService.createChat(payload)
  }

  @MessagePattern('sendMessage')
  public async sendMessage(@Payload() payload: DTO.SendMessageRequestDto): Promise<ServiceResponse<any>> {
    this.logger.debug({ '[sendMessage]': { payload } })
    return await this.chatService.sendMessage(payload)
  }

  @MessagePattern('getChatMessages')
  public async getChatMessages(@Payload() payload: { chatId: string }): Promise<ServiceResponse<any>> {
    this.logger.debug({ '[getChatMessages]': { payload } })
    return await this.chatService.getChatMessages(payload)
  }
}