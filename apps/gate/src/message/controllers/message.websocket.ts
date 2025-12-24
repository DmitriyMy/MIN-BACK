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
  IGetChatParticipantsRequest,
  IGetMessageRequest,
  IGetMessagesByChatIdRequest,
  IMessageCreateRequest,
  IMessageService,
  IMessageUpdateRequest,
  MessageId,
} from '@app/types/Message'
import { IUserDB, UserId } from '@app/types/User'
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

  // Маппинг userId -> Set<socketId> для быстрого поиска сокетов пользователя
  private userSockets = new Map<UserId, Set<string>>()

  // Маппинг socketId -> userId
  private socketUsers = new Map<string, UserId>()

  handleConnection(client: Socket & { user?: IUserDB }) {
    const userId = client.user?.userId
    if (!userId) {
      this.logger.warn({ '[handleConnection]': { error: 'No user in connection', clientId: client.id } })
      return
    }

    // Добавляем сокет в маппинг пользователя
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(client.id)
    this.socketUsers.set(client.id, userId)

    this.logger.debug({
      '[handleConnection]': { clientId: client.id, userId, totalSockets: this.userSockets.get(userId)!.size },
    })
  }

  handleDisconnect(client: Socket & { user?: IUserDB }) {
    const userId = this.socketUsers.get(client.id)
    if (userId) {
      const userSocketsSet = this.userSockets.get(userId)
      if (userSocketsSet) {
        userSocketsSet.delete(client.id)
        if (userSocketsSet.size === 0) {
          this.userSockets.delete(userId)
        }
      }
      this.socketUsers.delete(client.id)
      this.logger.debug({ '[handleDisconnect]': { clientId: client.id, userId } })
    }
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

      // Проверяем, что ответ успешный (имеет data)
      if (!('data' in response)) {
        client.emit('error', {
          message: 'error' in response ? response.error.join(', ') : commonError.INTERNAL_SERVER_ERROR,
        })
        return
      }

      // Отправляем ответ отправителю
      client.emit('createMessage:response', response)

      // Получаем участников чата
      const participantsRequest: IGetChatParticipantsRequest = {
        chatId: data.chatId,
        userId: user.userId,
      }
      const participantsResponse = await this.messageService.getChatParticipants(participantsRequest)

      // Проверяем, что ответ успешный (имеет data)
      if (!('data' in participantsResponse)) {
        this.logger.warn({ '[handleCreateMessage]': { error: 'Failed to get participants', chatId: data.chatId } })
        // Если пользователь не является участником чата, это уже обработано в сервисе через NotFoundException
        return
      }

      const participants = participantsResponse.data.participants

      this.logger.debug({ '[handleCreateMessage]': { participants, message: response.data.message } })

      // Отправляем новое сообщение всем подключенным участникам чата (кроме отправителя)
      participants.forEach((participantId: UserId) => {
        if (participantId !== user.userId) {
          const participantSockets = this.userSockets.get(participantId)
          if (participantSockets) {
            participantSockets.forEach((socketId) => {
              const socket = this.server.sockets.sockets.get(socketId)
              if (socket) {
                socket.emit('newMessage', response.data.message)
                this.logger.debug({
                  '[handleCreateMessage]': {
                    message: 'Sent newMessage to participant',
                    participantId,
                    socketId,
                    chatId: data.chatId,
                  },
                })
              } else {
                this.logger.warn({
                  '[handleCreateMessage]': {
                    message: 'Socket not found for participant',
                    participantId,
                    socketId,
                  },
                })
              }
            })
          } else {
            this.logger.debug({
              '[handleCreateMessage]': {
                message: 'No sockets found for participant',
                participantId,
              },
            })
          }
        }
      })
    } catch (error) {
      this.logger.error({ '[handleCreateMessage]': { error: error as Error } })
      // Если это NotFoundException, значит пользователь не является участником чата
      if (error instanceof NotFoundException || (error instanceof HttpException && error.getStatus() === 404)) {
        client.emit('error', { message: commonError.CHAT_NOT_FOUND })
      } else {
        client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
      }
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
