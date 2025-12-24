import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

import {
  IMessageCreateResponse,
  IMessageService,
  IMessageUpdateRequest,
  IMessageUpdateResponse,
  IMessageUpdateStatusRequest,
  IMessageUpdateStatusResponse,
  MessagesListResponse,
} from '@app/types/Message'
import { ServiceResponse, Response } from '@app/types/Service'
import { UserId } from '@app/types/User'

import * as DTO from '../dto'
import { MessageService } from '../services/message.service'

@Controller()
export class MessageController
  implements Pick<IMessageService, 'createMessage' | 'getMessagesByChatId' | 'updateMessage' | 'updateMessageStatus' | 'getChatParticipants'>
{
  private logger = new Logger(MessageController.name)

  @Inject(MessageService)
  private readonly messageService: MessageService

  @MessagePattern('createMessage')
  public async createMessage(@Payload() payload: DTO.MessageCreateRequestDto): ServiceResponse<IMessageCreateResponse> {
    const response = await this.messageService.createMessage(payload)
    return response
  }

  @MessagePattern('updateMessage')
  public async updateMessage(@Payload() payload: IMessageUpdateRequest): ServiceResponse<IMessageUpdateResponse> {
    const response = await this.messageService.updateMessage(payload)
    return response
  }

  @MessagePattern('updateMessageStatus')
  public async updateMessageStatus(
    @Payload() payload: IMessageUpdateStatusRequest,
  ): ServiceResponse<IMessageUpdateStatusResponse> {
    const response = await this.messageService.updateMessageStatus(payload)
    return response
  }

  @MessagePattern('getMessagesByChatId')
  public async getMessagesByChatId(@Payload() payload: DTO.GetMessagesByChatIdRequestDto): ServiceResponse<MessagesListResponse> {
    const response = await this.messageService.getMessagesByChatId(payload)
    return response
  }

  @MessagePattern('getChatParticipants')
  public async getChatParticipants(@Payload() payload: DTO.GetChatParticipantsRequestDto): ServiceResponse<Response<{ participants: UserId[] }>> {
    const response = await this.messageService.getChatParticipants(payload)
    return response
  }
}
