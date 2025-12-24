import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import { ChatsListResponse, IChatCreateResponse, IChatService, IAddUserToChatResponse } from '@app/types/Chat'
import { ServiceResponse } from '@app/types/Service'

import * as DTO from '../dto'
import { ChatService } from '../services/chat.service'

@Controller()
export class ChatController implements Pick<IChatService, 'createChat' | 'getChatsByUserId' | 'addUserToChat'> {
  @Inject(ChatService)
  private readonly chatService: ChatService

  @MessagePattern('createChat')
  public async createChat(@Payload() payload: DTO.ChatCreateRequestDto): ServiceResponse<IChatCreateResponse> {
    const response = await this.chatService.createChat(payload)
    return response
  }

  @MessagePattern('getChatsByUserId')
  public async getChatsByUserId(
    @Payload() payload: DTO.GetChatsByUserIdRequestDto,
  ): ServiceResponse<ChatsListResponse> {
    const response = await this.chatService.getChatsByUserId(payload)
    return response
  }

  @MessagePattern('addUserToChat')
  public async addUserToChat(@Payload() payload: DTO.AddUserToChatRpcDto): ServiceResponse<IAddUserToChatResponse> {
    const response = await this.chatService.addUserToChat(payload)
    return response
  }
}
