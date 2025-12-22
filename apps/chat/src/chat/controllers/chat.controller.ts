import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { ServiceResponse } from '@app/types/Service'
import { CreateChatResponse } from '@app/types/Chat'

import { ChatService } from '../services/chat.service'
import { CreateChatRequestDto } from '../dto'

@Controller()
export class ChatController {
  private logger = new Logger(ChatController.name)

  @Inject(ChatService)
  private readonly chatService: ChatService

  @MessagePattern('createChat')
  public async createChat(@Payload() payload: CreateChatRequestDto): Promise<ServiceResponse<CreateChatResponse>> {
    this.logger.debug({ '[createChat]': { payload } })
    const response = await this.chatService.createChat(payload)
    this.logger.debug({ '[createChat]': { response } })
    return response
  }
}
