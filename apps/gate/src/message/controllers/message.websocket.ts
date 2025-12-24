import { ForbiddenException, HttpException, Inject, Logger, NotFoundException, UseGuards } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

import { commonError } from '@app/errors'
import {
  IGetMessageRequest,
  IGetMessagesByChatIdRequest,
  IMessageCreateRequest,
  IMessageService,
  IMessageUpdateRequest,
  MessageId,
} from '@app/types/Message'
import { IUserDB } from '@app/types/User'
import { JwtAuthGuard, WsUser } from '../../auth/utils'

@WebSocketGateway({
  namespace: '/message',
  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class MessageWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private logger = new Logger(MessageWebSocketGateway.name)

  @Inject(IMessageService)
  private readonly messageService: IMessageService

  handleConnection(client: Socket & { user?: IUserDB }) {
    this.logger.debug({ '[handleConnection]': { clientId: client.id, userId: client.user?.userId } })
  }

  handleDisconnect(client: Socket & { user?: IUserDB }) {
    this.logger.debug({ '[handleDisconnect]': { clientId: client.id, userId: client.user?.userId } })
  }

  @SubscribeMessage('createMessage')
  async handleCreateMessage(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { chatId: string; message: string },
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleCreateMessage]': { user, data } })

    if (!data?.chatId || !data?.message) {
      client.emit('error', { message: 'chatId and message are required' })
      return
    }

    const requestData: IMessageCreateRequest = {
      chatId: data.chatId,
      message: data.message,
      senderId: user.userId,
    }

    try {
      const response = await this.messageService.createMessage(requestData)
      this.logger.debug({ '[handleCreateMessage]': { response } })
      client.emit('createMessage:response', response)
    } catch (error) {
      this.logger.error({ '[handleCreateMessage]': { error: error as Error } })
      client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
    }
  }

  @SubscribeMessage('getMessage')
  async handleGetMessage(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { messageId: MessageId },
    @WsUser() user: IUserDB,
  ) {
    if (!data?.messageId) {
      client.emit('error', { message: 'messageId is required' })
      return
    }

    const requestData: IGetMessageRequest = {
      messageId: data.messageId,
      senderId: user.userId,
    }

    this.logger.debug({ '[handleGetMessage]': { requestData } })

    try {
      const response = await this.messageService.getMessage(requestData)
      this.logger.debug({ '[handleGetMessage]': { response } })
      client.emit('getMessage:response', response)
    } catch (error) {
      this.logger.error({ '[handleGetMessage]': { error: error as Error } })
      client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
    }
  }

  @SubscribeMessage('updateMessage')
  async handleUpdateMessage(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { messageId: MessageId; message: string },
    @WsUser() user: IUserDB,
  ) {
    if (!data?.messageId) {
      client.emit('error', { message: 'messageId is required' })
      return
    }

    const updateData: IMessageUpdateRequest = {
      messageId: data.messageId,
      senderId: user.userId,
      message: data.message,
    }

    this.logger.debug({ '[handleUpdateMessage]': { updateData } })

    try {
      const response = await this.messageService.updateMessage(updateData)
      this.logger.debug({ '[handleUpdateMessage]': { response } })
      client.emit('updateMessage:response', response)
    } catch (error) {
      this.logger.error({ '[handleUpdateMessage]': { error: error as Error } })
      client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
    }
  }

  @SubscribeMessage('getMessagesByChatId')
  async handleGetMessagesByChatId(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { chatId: string; page: number; limit: number },
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleGetMessagesByChatId]': { user, data } })

    if (!data?.chatId) {
      client.emit('error', { message: 'chatId is required' })
      return
    }

    if (!data?.page || !data?.limit) {
      client.emit('error', { message: 'page and limit are required' })
      return
    }

    const requestData: IGetMessagesByChatIdRequest = {
      chatId: data.chatId,
      userId: user.userId,
      page: data.page,
      limit: data.limit,
    }

    try {
      const response = await this.messageService.getMessagesByChatId(requestData)
      this.logger.debug({ '[handleGetMessagesByChatId]': { response } })
      client.emit('getMessagesByChatId:response', response)
    } catch (error) {
      this.logger.error({ '[handleGetMessagesByChatId]': { error: error as Error } })

      // Проверяем тип ошибки
      if (error instanceof NotFoundException || (error instanceof HttpException && error.getStatus() === 404)) {
        client.emit('error', { message: commonError.CHAT_NOT_FOUND })
      } else if (error instanceof ForbiddenException || (error instanceof HttpException && error.getStatus() === 403)) {
        client.emit('error', { message: commonError.DONT_ACCESS })
      } else {
        client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
      }
    }
  }
}
