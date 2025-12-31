import { ForbiddenException, HttpException, Inject, Logger, NotFoundException, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
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
import { IUserDB, IUserService, UserId } from '@app/types/User'
import { JwtAuthGuard, WsUser } from '../../auth/utils'
import { getCorsOrigin } from '../../utils/cors.utils'

@WebSocketGateway({
  namespace: '/message',
  cors: {
    origin: getCorsOrigin(),
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

  @Inject(JwtService)
  private readonly jwtService: JwtService

  @Inject(IUserService)
  private readonly userService: IUserService

  @Inject(ConfigService)
  private readonly configService: ConfigService

  // Маппинг userId -> Set<socketId> для быстрого поиска сокетов пользователя
  private userSockets = new Map<UserId, Set<string>>()

  // Маппинг socketId -> userId
  private socketUsers = new Map<string, UserId>()

  async handleConnection(client: Socket & { user?: IUserDB }) {
    // Если пользователь не установлен guard'ом, пытаемся аутентифицировать вручную
    if (!client.user) {
      this.logger.debug({
        '[handleConnection]': {
          message: 'User not set by guard, attempting manual authentication',
          clientId: client.id,
          hasAuth: !!client.handshake.auth,
          authKeys: Object.keys(client.handshake.auth || {}),
        },
      })

      const user = await JwtAuthGuard.authenticateWebSocketConnection(
        client,
        this.jwtService,
        this.userService,
        this.configService,
        this.logger,
      )

      if (!user) {
        this.logger.warn({
          '[handleConnection]': {
            error: 'Authentication failed',
            clientId: client.id,
            hasAuth: !!client.handshake.auth,
            authKeys: Object.keys(client.handshake.auth || {}),
          },
        })
        client.disconnect(true)
        return
      }

      client.user = user

      this.logger.debug({
        '[handleConnection]': {
          message: 'User authenticated manually',
          clientId: client.id,
          userId: user.userId,
        },
      })
    }

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
    @MessageBody() data: { chatId: string; message: string; encrypted?: boolean },
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({
      '[handleCreateMessage]': { user, data: { ...data, message: data.message?.substring(0, 50) + '...' } },
    })

    if (!data?.chatId || !data?.message) {
      client.emit('error', { message: 'chatId and message are required' })
      return
    }

    // For E2E encryption, the message is already encrypted on the client
    // Server stores it as-is without decrypting
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

      // Отправляем новое сообщение всем подписанным на чат (включая отправителя) через room
      const roomName = `chat:${data.chatId}`
      this.server.to(roomName).emit('newMessage', response.data.message)

      this.logger.debug({
        '[handleCreateMessage]': {
          message: 'Sent newMessage to chat room',
          chatId: data.chatId,
          roomName,
        },
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

  @SubscribeMessage('subscribeToChat')
  async handleSubscribeToChat(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { chatId: string },
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleSubscribeToChat]': { user, data } })

    if (!data?.chatId) {
      client.emit('error', { message: 'chatId is required' })
      return
    }

    try {
      // Проверяем, что пользователь является участником чата
      const participantsRequest: IGetChatParticipantsRequest = {
        chatId: data.chatId,
        userId: user.userId,
      }
      const participantsResponse = await this.messageService.getChatParticipants(participantsRequest)

      // Проверяем, что ответ успешный (имеет data)
      if (!('data' in participantsResponse)) {
        client.emit('error', { message: commonError.CHAT_NOT_FOUND })
        return
      }

      // Присоединяемся к комнате чата
      const roomName = `chat:${data.chatId}`
      client.join(roomName)

      this.logger.debug({
        '[handleSubscribeToChat]': {
          message: 'User subscribed to chat',
          userId: user.userId,
          chatId: data.chatId,
          roomName,
          socketId: client.id,
        },
      })

      client.emit('subscribeToChat:response', { chatId: data.chatId, success: true })
    } catch (error) {
      this.logger.error({ '[handleSubscribeToChat]': { error: error as Error } })

      if (error instanceof NotFoundException || (error instanceof HttpException && error.getStatus() === 404)) {
        client.emit('error', { message: commonError.CHAT_NOT_FOUND })
      } else if (error instanceof ForbiddenException || (error instanceof HttpException && error.getStatus() === 403)) {
        client.emit('error', { message: commonError.DONT_ACCESS })
      } else {
        client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
      }
    }
  }

  @SubscribeMessage('unsubscribeFromChat')
  async handleUnsubscribeFromChat(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { chatId: string },
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleUnsubscribeFromChat]': { user, data } })

    if (!data?.chatId) {
      client.emit('error', { message: 'chatId is required' })
      return
    }

    const roomName = `chat:${data.chatId}`
    client.leave(roomName)

    this.logger.debug({
      '[handleUnsubscribeFromChat]': {
        message: 'User unsubscribed from chat',
        userId: user.userId,
        chatId: data.chatId,
        roomName,
        socketId: client.id,
      },
    })

    client.emit('unsubscribeFromChat:response', { chatId: data.chatId, success: true })
  }

  @SubscribeMessage('getChatParticipants')
  async handleGetChatParticipants(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { chatId: string; userId: string },
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleGetChatParticipants]': { user, data } })

    if (!data?.chatId) {
      client.emit('getChatParticipants:response', {
        status: 400,
        error: 'chatId is required',
      })
      return
    }

    try {
      const participantsRequest: IGetChatParticipantsRequest = {
        chatId: data.chatId,
        userId: user.userId,
      }
      const participantsResponse = await this.messageService.getChatParticipants(participantsRequest)

      // Проверяем, что ответ успешный (имеет data)
      if (!('data' in participantsResponse)) {
        client.emit('getChatParticipants:response', {
          status: 404,
          error: commonError.CHAT_NOT_FOUND,
        })
        return
      }

      client.emit('getChatParticipants:response', {
        status: 200,
        data: participantsResponse.data,
      })
    } catch (error) {
      this.logger.error({ '[handleGetChatParticipants]': { error: error as Error } })

      if (error instanceof NotFoundException || (error instanceof HttpException && error.getStatus() === 404)) {
        client.emit('getChatParticipants:response', {
          status: 404,
          error: commonError.CHAT_NOT_FOUND,
        })
      } else if (error instanceof ForbiddenException || (error instanceof HttpException && error.getStatus() === 403)) {
        client.emit('getChatParticipants:response', {
          status: 403,
          error: commonError.DONT_ACCESS,
        })
      } else {
        client.emit('getChatParticipants:response', {
          status: 500,
          error: commonError.INTERNAL_SERVER_ERROR,
        })
      }
    }
  }

  /**
   * Exchange encryption key with chat participants
   * This allows participants to share encryption keys for E2E encryption
   */
  @SubscribeMessage('exchangeEncryptionKey')
  async handleExchangeEncryptionKey(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { chatId: string; keyMaterial: string; keyId: string },
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleExchangeEncryptionKey]': { user: user.userId, chatId: data.chatId } })

    if (!data?.chatId || !data?.keyMaterial || !data?.keyId) {
      client.emit('error', { message: 'chatId, keyMaterial, and keyId are required' })
      return
    }

    try {
      // Verify user is a participant
      const participantsRequest: IGetChatParticipantsRequest = {
        chatId: data.chatId,
        userId: user.userId,
      }
      const participantsResponse = await this.messageService.getChatParticipants(participantsRequest)

      if (!('data' in participantsResponse)) {
        client.emit('error', { message: commonError.CHAT_NOT_FOUND })
        return
      }

      const participants = participantsResponse.data.participants
      const otherParticipants = participants.filter((p) => p !== user.userId)

      // Send key to other participants directly via their sockets
      // This ensures delivery even if they haven't subscribed to the room yet
      const roomName = `chat:${data.chatId}`

      // Get room size safely (adapter might not be available in all Socket.IO versions)
      let roomSize = 0
      try {
        if (this.server.sockets?.adapter?.rooms) {
          const room = this.server.sockets.adapter.rooms.get(roomName)
          roomSize = room ? room.size : 0
        }
      } catch (error) {
        // If we can't get room size, it's not critical - we'll still send to sockets directly
        this.logger.debug({
          '[handleExchangeEncryptionKey]': {
            message: 'Could not get room size',
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }

      let sentCount = 0
      const keyPayload = {
        chatId: data.chatId,
        keyMaterial: data.keyMaterial,
        keyId: data.keyId,
        fromUserId: user.userId,
      }

      // Send to all sockets of other participants
      for (const participantId of otherParticipants) {
        const participantSockets = this.userSockets.get(participantId)
        if (participantSockets && participantSockets.size > 0) {
          for (const socketId of participantSockets) {
            // Safely get socket - sockets structure may vary in Socket.IO versions
            let socket: Socket | undefined
            try {
              if (this.server.sockets?.sockets) {
                socket = this.server.sockets.sockets.get(socketId)
              } else if (this.server.sockets instanceof Map) {
                socket = this.server.sockets.get(socketId)
              }
            } catch (error) {
              this.logger.debug({
                '[handleExchangeEncryptionKey]': {
                  message: 'Could not get socket',
                  socketId,
                  error: error instanceof Error ? error.message : String(error),
                },
              })
            }

            if (socket) {
              socket.emit('encryptionKeyReceived', keyPayload)
              sentCount++
              this.logger.debug({
                '[handleExchangeEncryptionKey]': {
                  message: 'Sent encryption key to participant socket',
                  chatId: data.chatId,
                  fromUserId: user.userId,
                  toUserId: participantId,
                  socketId,
                  keyId: data.keyId,
                },
              })
            }
          }
        }
      }

      // Also broadcast to room for participants who might join later
      this.server.to(roomName).emit('encryptionKeyReceived', keyPayload)

      this.logger.debug({
        '[handleExchangeEncryptionKey]': {
          message: 'Encryption key sent',
          chatId: data.chatId,
          fromUserId: user.userId,
          keyId: data.keyId,
          participantsCount: participants.length,
          otherParticipantsCount: otherParticipants.length,
          sentToSockets: sentCount,
          roomName,
          roomSize,
        },
      })

      client.emit('exchangeEncryptionKey:response', { success: true })
    } catch (error) {
      this.logger.error({ '[handleExchangeEncryptionKey]': { error: error as Error } })

      if (error instanceof NotFoundException || (error instanceof HttpException && error.getStatus() === 404)) {
        client.emit('error', { message: commonError.CHAT_NOT_FOUND })
      } else if (error instanceof ForbiddenException || (error instanceof HttpException && error.getStatus() === 403)) {
        client.emit('error', { message: commonError.DONT_ACCESS })
      } else {
        client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
      }
    }
  }

  /**
   * Request encryption key from chat participants
   * When a user needs a key for a specific keyId, they can request it
   */
  @SubscribeMessage('requestEncryptionKey')
  async handleRequestEncryptionKey(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { chatId: string; keyId: string },
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleRequestEncryptionKey]': { user: user.userId, chatId: data.chatId, keyId: data.keyId } })

    if (!data?.chatId || !data?.keyId) {
      client.emit('error', { message: 'chatId and keyId are required' })
      return
    }

    try {
      // Verify user is a participant
      const participantsRequest: IGetChatParticipantsRequest = {
        chatId: data.chatId,
        userId: user.userId,
      }
      const participantsResponse = await this.messageService.getChatParticipants(participantsRequest)

      if (!('data' in participantsResponse)) {
        client.emit('error', { message: commonError.CHAT_NOT_FOUND })
        return
      }

      // Broadcast key request to all participants
      // Send directly to their sockets AND to the room for reliability
      const participants = participantsResponse.data.participants
      const otherParticipants = participants.filter((p) => p !== user.userId)
      const roomName = `chat:${data.chatId}`

      // Get room size safely (adapter might not be available in all Socket.IO versions)
      let roomSize = 0
      try {
        if (this.server.sockets?.adapter?.rooms) {
          const room = this.server.sockets.adapter.rooms.get(roomName)
          roomSize = room ? room.size : 0
        }
      } catch (error) {
        // If we can't get room size, it's not critical - we'll still send to sockets directly
        this.logger.debug({
          '[handleRequestEncryptionKey]': {
            message: 'Could not get room size',
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }

      const requestPayload = {
        chatId: data.chatId,
        keyId: data.keyId,
        requestedBy: user.userId,
      }

      let sentCount = 0
      // Send to all sockets of other participants directly
      for (const participantId of otherParticipants) {
        const participantSockets = this.userSockets.get(participantId)
        if (participantSockets && participantSockets.size > 0) {
          for (const socketId of participantSockets) {
            // Safely get socket - sockets structure may vary in Socket.IO versions
            let socket: Socket | undefined
            try {
              if (this.server.sockets?.sockets) {
                socket = this.server.sockets.sockets.get(socketId)
              } else if (this.server.sockets instanceof Map) {
                socket = this.server.sockets.get(socketId)
              }
            } catch (error) {
              this.logger.debug({
                '[handleRequestEncryptionKey]': {
                  message: 'Could not get socket',
                  socketId,
                  error: error instanceof Error ? error.message : String(error),
                },
              })
            }

            if (socket) {
              socket.emit('encryptionKeyRequested', requestPayload)
              sentCount++
            }
          }
        }
      }

      // Also broadcast to room for participants who might join later
      this.server.to(roomName).emit('encryptionKeyRequested', requestPayload)

      this.logger.debug({
        '[handleRequestEncryptionKey]': {
          message: 'Encryption key requested',
          chatId: data.chatId,
          keyId: data.keyId,
          requestedBy: user.userId,
          participantsCount: participants.length,
          otherParticipantsCount: otherParticipants.length,
          sentToSockets: sentCount,
          roomName,
          roomSize,
        },
      })

      client.emit('requestEncryptionKey:response', { success: true })
    } catch (error) {
      this.logger.error({
        '[handleRequestEncryptionKey]': {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          chatId: data?.chatId,
          keyId: data?.keyId,
          userId: user?.userId,
        },
      })

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
