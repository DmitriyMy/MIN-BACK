import { Inject, Logger, OnModuleInit, UseGuards } from '@nestjs/common'
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
import { v4 as uuidv4 } from 'uuid'

import { CallEvent } from '@app/constants/call'
import { ChatType } from '@app/constants/chat'
import { commonError } from '@app/errors'
import { CallId, CallStatus, IInitiateCallResponse, IVpnConnectionConfig } from '@app/types/Call'
import { IChatService } from '@app/types/Chat'
import { IMessageService } from '@app/types/Message'
import { IUserDB, IUserService, UserId } from '@app/types/User'
import { isErrorServiceResponse } from '@app/utils/service'
import { JwtAuthGuard, WsUser } from '../../auth/utils'
import { CallRateLimiterService } from '../services/call-rate-limiter.service'
import { VpnConfigService } from '../services/vpn-config.service'
import { getCorsOrigin } from '../../utils/cors.utils'
import * as DTO from '../dto'

interface CallSession {
  callId: CallId
  callerId: UserId
  calleeId: UserId
  status: CallStatus
  createdAt: number // Timestamp создания звонка
  lastStatusChange: number // Timestamp последнего изменения статуса
  callerSocketId?: string
  calleeSocketId?: string
  callerVpnConfig?: IVpnConnectionConfig
  calleeVpnConfig?: IVpnConnectionConfig
}

@WebSocketGateway({
  namespace: '/call',
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class CallWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server

  private logger = new Logger(CallWebSocketGateway.name)

  // Хранилище активных звонков
  private activeCalls = new Map<CallId, CallSession>()

  // Таймеры для таймаутов звонков
  private callTimers = new Map<CallId, NodeJS.Timeout>()

  // Маппинг userId -> Set<socketId> для быстрого поиска сокетов пользователя
  private userSockets = new Map<UserId, Set<string>>()

  // Маппинг socketId -> userId
  private socketUsers = new Map<string, UserId>()

  // Настройки таймаутов из переменных окружения
  private callTimeouts!: Record<CallStatus, number>

  // Защита от replay атак: callId -> Set<nonce> (использованные nonce для каждого звонка)
  private usedSignalNonces = new Map<CallId, Set<string>>()

  // Максимальный возраст сигнала (в миллисекундах)
  private readonly SIGNAL_MAX_AGE: number

  @Inject(IUserService)
  private readonly userService: IUserService

  @Inject(IChatService)
  private readonly chatService: IChatService

  @Inject(IMessageService)
  private readonly messageService: IMessageService

  @Inject(VpnConfigService)
  private readonly vpnConfigService: VpnConfigService

  @Inject(CallRateLimiterService)
  private readonly rateLimiter: CallRateLimiterService

  @Inject(JwtService)
  private readonly jwtService: JwtService

  @Inject(ConfigService)
  private readonly configService: ConfigService

  private static readonly CALL_NOT_FOUND_MESSAGE = 'Call not found'

  onModuleInit() {
    // Загружаем настройки таймаутов из переменных окружения
    const initiatingTimeout = parseInt(
      this.configService.get<string>('CALL_TIMEOUT_INITIATING_SECONDS') || '30',
      10,
    ) * 1000
    const ringingTimeout = parseInt(
      this.configService.get<string>('CALL_TIMEOUT_RINGING_SECONDS') || '60',
      10,
    ) * 1000
    const connectingTimeout = parseInt(
      this.configService.get<string>('CALL_TIMEOUT_CONNECTING_SECONDS') || '120',
      10,
    ) * 1000
    const activeTimeout = parseInt(
      this.configService.get<string>('CALL_TIMEOUT_ACTIVE_MINUTES') || '60',
      10,
    ) * 60 * 1000

    this.callTimeouts = {
      [CallStatus.initiating]: initiatingTimeout,
      [CallStatus.ringing]: ringingTimeout,
      [CallStatus.connecting]: connectingTimeout,
      [CallStatus.active]: activeTimeout,
      [CallStatus.ended]: 0, // Завершенные звонки не имеют таймаута
      [CallStatus.rejected]: 0, // Отклоненные звонки не имеют таймаута
      [CallStatus.cancelled]: 0, // Отмененные звонки не имеют таймаута
    }

    this.logger.debug({
      '[onModuleInit]': {
        callTimeouts: {
          initiating: `${initiatingTimeout / 1000}s`,
          ringing: `${ringingTimeout / 1000}s`,
          connecting: `${connectingTimeout / 1000}s`,
          active: `${activeTimeout / 60000}min`,
        },
      },
    })

    // Периодическая очистка истекших звонков (каждые 5 минут)
    setInterval(() => this.cleanupExpiredCalls(), 5 * 60 * 1000)

    // Загружаем максимальный возраст сигнала из переменных окружения
    this.SIGNAL_MAX_AGE =
      parseInt(this.configService.get<string>('CALL_WEBRTC_SIGNAL_MAX_AGE_SECONDS') || '30', 10) * 1000

    this.logger.debug({
      '[onModuleInit]': {
        signalMaxAge: `${this.SIGNAL_MAX_AGE / 1000}s`,
      },
    })
  }

  /**
   * Проверяет, есть ли у двух пользователей общий персональный чат (ровно 2 участника)
   */
  private async hasCommonPersonalChat(userId1: UserId, userId2: UserId): Promise<boolean> {
    try {
      // Получаем список чатов первого пользователя
      const user1ChatsResponse = await this.chatService.getChatsByUserId({
        userId: userId1,
        page: 1,
        limit: 100, // Получаем достаточно чатов для проверки
      })

      if (isErrorServiceResponse(user1ChatsResponse) || !user1ChatsResponse.data?.items) {
        this.logger.warn({
          '[hasCommonPersonalChat]': { error: 'Failed to get chats for user1', userId1 },
        })
        return false
      }

      const user1Chats = user1ChatsResponse.data.items

      // Проверяем каждый чат первого пользователя
      for (const chat of user1Chats) {
        // Проверяем, что это персональный чат
        if (chat.type !== ChatType.PRIVATE) {
          continue
        }

        // Получаем участников чата
        const participantsResponse = await this.messageService.getChatParticipants({
          chatId: chat.chatId,
          userId: userId1,
        })

        if (isErrorServiceResponse(participantsResponse) || !participantsResponse.data?.participants) {
          continue
        }

        const participants = participantsResponse.data.participants

        // Проверяем, что чат персональный (ровно 2 участника) и второй пользователь в нем
        if (participants.length === 2 && participants.includes(userId2)) {
          this.logger.debug({
            '[hasCommonPersonalChat]': {
              message: 'Found common personal chat',
              userId1,
              userId2,
              chatId: chat.chatId,
            },
          })
          return true
        }
      }

      this.logger.debug({
        '[hasCommonPersonalChat]': {
          message: 'No common personal chat found',
          userId1,
          userId2,
        },
      })
      return false
    } catch (error) {
      this.logger.error({
        '[hasCommonPersonalChat]': {
          error: error instanceof Error ? error.message : String(error),
          userId1,
          userId2,
        },
      })
      return false
    }
  }

  /**
   * Получает сокет по ID из namespace
   * Поддерживает разные структуры Socket.IO
   */
  private getSocketById(socketId: string): Socket | null {
    try {
      // Вариант 1: this.server.sockets - это Map напрямую
      if (this.server.sockets && typeof (this.server.sockets as Map<string, Socket>).get === 'function') {
        const socket = (this.server.sockets as Map<string, Socket>).get(socketId)
        if (socket) return socket
      }

      // Вариант 2: this.server.sockets.sockets - это Map
      if ((this.server.sockets as any)?.sockets && typeof (this.server.sockets as any).sockets.get === 'function') {
        const socket = (this.server.sockets as any).sockets.get(socketId)
        if (socket) return socket
      }

      return null
    } catch (error) {
      this.logger.error({
        '[getSocketById]': {
          error: error instanceof Error ? error.message : String(error),
          socketId,
        },
      })
      return null
    }
  }

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
      client.userId = user.userId

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
      this.logger.warn({
        '[handleConnection]': {
          error: 'No user in connection after authentication',
          clientId: client.id,
        },
      })
      client.disconnect(true)
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

    // Проверяем, есть ли ожидающие входящие звонки для этого пользователя
    // и отправляем уведомления, если пользователь был офлайн при создании звонка
    this.activeCalls.forEach((callSession, callId) => {
      if (
        callSession.calleeId === userId &&
        callSession.status === CallStatus.initiating &&
        !callSession.calleeSocketId
      ) {
        // Есть звонок, который был создан пока пользователь был офлайн
        const incomingCallData = {
          callId,
          callerId: callSession.callerId,
          calleeId: callSession.calleeId,
        }
        client.emit(CallEvent.INCOMING_CALL, incomingCallData)
        callSession.calleeSocketId = client.id
        callSession.status = CallStatus.ringing
        this.logger.debug({
          '[handleConnection]': { message: 'Delivered pending incoming call', callId, userId },
        })
      }
    })
  }

  handleDisconnect(client: Socket & { user?: IUserDB }) {
    const userId = this.socketUsers.get(client.id)
    if (!userId) {
      this.logger.warn({ '[handleDisconnect]': { error: 'No user mapping found', clientId: client.id } })
      return
    }

    // Удаляем сокет из маппинга
    const userSocketSet = this.userSockets.get(userId)
    if (userSocketSet) {
      userSocketSet.delete(client.id)
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId)
      }
    }
    this.socketUsers.delete(client.id)

    // Завершаем активные звонки для этого пользователя
    this.endCallsForUser(userId, client.id)

    this.logger.debug({
      '[handleDisconnect]': { clientId: client.id, userId },
    })
  }

  @SubscribeMessage(CallEvent.INITIATE_CALL)
  async handleInitiateCall(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: DTO.InitiateCallDtoRequest,
    @WsUser() user: IUserDB,
  ) {
    try {
      this.logger.debug({ '[handleInitiateCall]': { user: user.userId, data } })

      const { calleeId } = data
      const callerId = user.userId

      // Проверяем, что пользователь не звонит сам себе
      if (callerId === calleeId) {
        client.emit(CallEvent.CALL_ERROR, { message: 'Cannot call yourself' })
        return
      }

      // Проверка rate limiting
      const rateLimitCheck = this.rateLimiter.canInitiateCall(callerId, calleeId)
      if (!rateLimitCheck.allowed) {
        this.logger.warn({
          '[handleInitiateCall]': {
            reason: 'Rate limit exceeded',
            callerId,
            calleeId,
            message: rateLimitCheck.reason,
          },
        })
        client.emit(CallEvent.CALL_ERROR, { message: rateLimitCheck.reason })
        return
      }

      // Проверяем существование вызываемого пользователя
      try {
        const userResponse = await this.userService.getUser({ userId: calleeId })
        if (isErrorServiceResponse(userResponse)) {
          this.logger.warn({ '[handleInitiateCall]': { error: 'User not found', calleeId } })
          client.emit(CallEvent.CALL_ERROR, { message: 'User not found' })
          return
        }
      } catch (error) {
        this.logger.error({ '[handleInitiateCall]': { error: error as Error } })
        client.emit(CallEvent.CALL_ERROR, { message: commonError.INTERNAL_SERVER_ERROR })
        return
      }

      // Проверяем, что у пользователей есть общий персональный чат
      const hasCommonChat = await this.hasCommonPersonalChat(callerId, calleeId)
      if (!hasCommonChat) {
        this.logger.warn({
          '[handleInitiateCall]': {
            error: 'No common personal chat found',
            callerId,
            calleeId,
          },
        })
        client.emit(CallEvent.CALL_ERROR, {
          message: 'You can only call users with whom you have a personal chat',
        })
        return
      }

      // Создаем новый звонок
      const callId = uuidv4()
      const now = Date.now()
      const callSession: CallSession = {
        callId,
        callerId,
        calleeId,
        status: CallStatus.initiating,
        createdAt: now,
        lastStatusChange: now,
        callerSocketId: client.id,
      }

      this.activeCalls.set(callId, callSession)

      // Устанавливаем таймаут для звонка
      this.setupCallTimeout(callId, callSession)

      const response: IInitiateCallResponse = {
        callId,
        callerId,
        calleeId,
      }

      // Отправляем ответ инициатору
      client.emit(CallEvent.CALL_INITIATED, response)

      // Отправляем уведомление вызываемому пользователю
      const incomingCallData = {
        callId,
        callerId,
        calleeId,
      }

      const calleeSockets = this.userSockets.get(calleeId)
      this.logger.debug({
        '[handleInitiateCall]': {
          calleeId,
          hasCalleeSockets: !!calleeSockets,
          socketCount: calleeSockets?.size || 0,
          allUserSockets: Array.from(this.userSockets.keys()),
        },
      })

      let calleeSocketFound = false

      // Отправляем уведомление через /call namespace, если пользователь подключен
      if (calleeSockets && calleeSockets.size > 0) {
        calleeSockets.forEach((socketId) => {
          const socket = this.getSocketById(socketId)
          if (socket) {
            this.logger.debug({
              '[handleInitiateCall]': { message: 'Sending incoming-call to socket', socketId, calleeId },
            })
            socket.emit(CallEvent.INCOMING_CALL, incomingCallData)
            if (!calleeSocketFound) {
              callSession.calleeSocketId = socketId
              calleeSocketFound = true
            }
          } else {
            // Если сокет не найден, используем альтернативный способ отправки через room
            this.logger.debug({
              '[handleInitiateCall]': {
                message: 'Socket not found, using server.to() as fallback',
                socketId,
                calleeId,
              },
            })
            this.server.to(socketId).emit(CallEvent.INCOMING_CALL, incomingCallData)
            if (!calleeSocketFound) {
              callSession.calleeSocketId = socketId
              calleeSocketFound = true
            }
          }
        })
        this.logger.debug({
          '[handleInitiateCall]': {
            message: 'Incoming call notification sent via /call namespace',
            calleeId,
            socketCount: calleeSockets.size,
          },
        })
      }

      // Если пользователь не подключен к /call namespace, звонок будет доставлен
      // автоматически при его подключении (см. handleConnection)

      // Обновляем статус звонка
      callSession.status = CallStatus.ringing
      callSession.lastStatusChange = Date.now()

      // Обновляем таймаут для нового статуса
      this.setupCallTimeout(callId, callSession)

      // Отмечаем начало звонка в rate limiter
      this.rateLimiter.onCallStarted(callerId)

      this.logger.debug({ '[handleInitiateCall]': { callId, response } })
    } catch (error) {
      this.logger.error({
        '[handleInitiateCall]': {
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      })
      client.emit(CallEvent.CALL_ERROR, {
        message: error instanceof Error ? error.message : commonError.INTERNAL_SERVER_ERROR,
      })
    }
  }

  @SubscribeMessage(CallEvent.ACCEPT_CALL)
  async handleAcceptCall(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: DTO.AcceptCallDtoRequest,
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleAcceptCall]': { user: user.userId, callId: data.callId } })

    const callSession = this.activeCalls.get(data.callId)
    if (!callSession) {
      client.emit(CallEvent.CALL_ERROR, { message: CallWebSocketGateway.CALL_NOT_FOUND_MESSAGE })
      return
    }

    // Проверяем, что пользователь является вызываемым
    if (callSession.calleeId !== user.userId) {
      client.emit(CallEvent.CALL_ERROR, { message: 'Not authorized to accept this call' })
      return
    }

    // Проверяем, что у пользователей есть общий чат (для безопасности)
    const hasCommonChat = await this.hasCommonPersonalChat(callSession.callerId, callSession.calleeId)
    if (!hasCommonChat) {
      this.logger.warn({
        '[handleAcceptCall]': {
          error: 'No common personal chat found',
          callerId: callSession.callerId,
          calleeId: callSession.calleeId,
        },
      })
      client.emit(CallEvent.CALL_ERROR, {
        message: 'You can only accept calls from users with whom you have a personal chat',
      })
      return
    }

    // Генерируем VPN конфигурации для обоих участников
    const callerVpnConfig = this.vpnConfigService.generateVpnConfig(data.callId, callSession.callerId, true)
    const calleeVpnConfig = this.vpnConfigService.generateVpnConfig(data.callId, callSession.calleeId, false)

    callSession.callerVpnConfig = callerVpnConfig
    callSession.calleeVpnConfig = calleeVpnConfig

    // Отправляем VPN конфигурацию вызываемому (принявшему звонок)
    client.emit(CallEvent.VPN_CONFIG_RECEIVED, calleeVpnConfig)

    // Отправляем VPN конфигурацию инициатору
    const callerSockets = this.userSockets.get(callSession.callerId)
    if (callerSockets && callerSockets.size > 0) {
      callerSockets.forEach((socketId) => {
        const socket = this.getSocketById(socketId)
        if (socket) {
          socket.emit(CallEvent.CALL_ACCEPTED, { callId: data.callId })
          socket.emit(CallEvent.VPN_CONFIG_RECEIVED, callerVpnConfig)
        }
      })
    }

    callSession.status = CallStatus.connecting
    callSession.lastStatusChange = Date.now()

    // Обновляем таймаут для нового статуса
    this.setupCallTimeout(data.callId, callSession)

    this.logger.debug({ '[handleAcceptCall]': { callId: data.callId, vpnConfigsGenerated: true } })
  }

  @SubscribeMessage(CallEvent.VPN_READY)
  handleVpnReady(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: DTO.VpnReadyDtoRequest,
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleVpnReady]': { user: user.userId, callId: data.callId } })

    const callSession = this.activeCalls.get(data.callId)
    if (!callSession) {
      client.emit(CallEvent.CALL_ERROR, { message: CallWebSocketGateway.CALL_NOT_FOUND_MESSAGE })
      return
    }

    // Проверяем, что пользователь является участником звонка
    const NOT_AUTHORIZED_MESSAGE = 'Not authorized for this call'
    if (callSession.callerId !== user.userId && callSession.calleeId !== user.userId) {
      client.emit(CallEvent.CALL_ERROR, { message: NOT_AUTHORIZED_MESSAGE })
      return
    }

    // Отправляем уведомление другому участнику, что VPN готов
    const targetUserId = callSession.callerId === user.userId ? callSession.calleeId : callSession.callerId
    const targetSockets = this.userSockets.get(targetUserId)

    if (targetSockets && targetSockets.size > 0) {
      targetSockets.forEach((socketId) => {
        const socket = this.getSocketById(socketId)
        if (socket) {
          socket.emit(CallEvent.VPN_CONNECTED, {
            callId: data.callId,
            peerEndpoint: data.localEndpoint,
          })
        }
      })
    }

    // Если оба участника готовы, обновляем статус
    if (callSession.status === CallStatus.connecting) {
      callSession.status = CallStatus.active
      callSession.lastStatusChange = Date.now()

      // Обновляем таймаут для активного звонка
      this.setupCallTimeout(data.callId, callSession)
    }

    this.logger.debug({ '[handleVpnReady]': { callId: data.callId, userId: user.userId } })
  }

  @SubscribeMessage(CallEvent.REJECT_CALL)
  handleRejectCall(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: DTO.RejectCallDtoRequest,
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleRejectCall]': { user: user.userId, callId: data.callId } })

    const callSession = this.activeCalls.get(data.callId)
    if (!callSession) {
      client.emit(CallEvent.CALL_ERROR, { message: CallWebSocketGateway.CALL_NOT_FOUND_MESSAGE })
      return
    }

    // Проверяем, что пользователь является участником звонка
    const NOT_AUTHORIZED_MESSAGE = 'Not authorized for this call'
    if (callSession.callerId !== user.userId && callSession.calleeId !== user.userId) {
      client.emit(CallEvent.CALL_ERROR, { message: NOT_AUTHORIZED_MESSAGE })
      return
    }

    // Отправляем уведомление другому участнику
    const targetUserId = callSession.callerId === user.userId ? callSession.calleeId : callSession.callerId
    const targetSockets = this.userSockets.get(targetUserId)

    if (targetSockets && targetSockets.size > 0) {
      targetSockets.forEach((socketId) => {
        const socket = this.getSocketById(socketId)
        if (socket) {
          socket.emit(CallEvent.CALL_REJECTED, { callId: data.callId })
        }
      })
    }

    callSession.status = CallStatus.rejected
    callSession.lastStatusChange = Date.now()

    // Очищаем таймер
    this.clearCallTimeout(data.callId)

    // Очищаем использованные nonce для этого звонка
    this.cleanupUsedSignalNonces(data.callId)

    // Удаляем звонок
    this.activeCalls.delete(data.callId)

    // Устанавливаем cooldown после отклонения звонка
    if (callSession.calleeId === user.userId) {
      // Звонок отклонен вызываемым пользователем
      this.rateLimiter.onCallRejected(callSession.callerId, callSession.calleeId)
    }

    // Отмечаем завершение звонка в rate limiter
    this.rateLimiter.onCallEnded(callSession.callerId)

    client.emit(CallEvent.CALL_REJECTED, { callId: data.callId })
  }

  @SubscribeMessage(CallEvent.HANGUP)
  handleHangup(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: DTO.HangupDtoRequest,
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleHangup]': { user: user.userId, callId: data.callId } })

    const callSession = this.activeCalls.get(data.callId)
    if (!callSession) {
      this.logger.warn({ '[handleHangup]': { error: 'Call not found', callId: data.callId, userId: user.userId } })
      client.emit(CallEvent.CALL_ERROR, { message: CallWebSocketGateway.CALL_NOT_FOUND_MESSAGE })
      return
    }

    // Проверяем, что пользователь является участником звонка
    const NOT_AUTHORIZED_MESSAGE = 'Not authorized for this call'
    if (callSession.callerId !== user.userId && callSession.calleeId !== user.userId) {
      this.logger.warn({
        '[handleHangup]': {
          error: 'Not authorized',
          callId: data.callId,
          userId: user.userId,
          callerId: callSession.callerId,
          calleeId: callSession.calleeId,
        },
      })
      client.emit(CallEvent.CALL_ERROR, { message: NOT_AUTHORIZED_MESSAGE })
      return
    }

    // Определяем другого участника
    const targetUserId = callSession.callerId === user.userId ? callSession.calleeId : callSession.callerId
    const targetSockets = this.userSockets.get(targetUserId)

    this.logger.debug({
      '[handleHangup]': {
        callId: data.callId,
        hangupBy: user.userId,
        targetUserId,
        hasTargetSockets: !!targetSockets,
        targetSocketCount: targetSockets?.size || 0,
      },
    })

    // Отправляем уведомление другому участнику
    if (targetSockets && targetSockets.size > 0) {
      let sentCount = 0
      targetSockets.forEach((socketId) => {
        const socket = this.getSocketById(socketId)
        if (socket) {
          socket.emit(CallEvent.CALL_HANGUP, { callId: data.callId })
          sentCount++
          this.logger.debug({
            '[handleHangup]': {
              message: 'Hangup notification sent to target user',
              socketId,
              targetUserId,
            },
          })
        } else {
          this.logger.warn({
            '[handleHangup]': {
              message: 'Target socket not found',
              socketId,
              targetUserId,
            },
          })
        }
      })
      this.logger.debug({
        '[handleHangup]': {
          message: 'Hangup notifications sent',
          targetUserId,
          sentCount,
          totalSockets: targetSockets.size,
        },
      })
    } else {
      this.logger.warn({
        '[handleHangup]': {
          message: 'Target user has no active sockets',
          targetUserId,
        },
      })
    }

    // Обновляем статус
    callSession.status = CallStatus.ended
    callSession.lastStatusChange = Date.now()

    // Очищаем таймер
    this.clearCallTimeout(data.callId)

    // Очищаем использованные nonce для этого звонка
    this.cleanupUsedSignalNonces(data.callId)

    // Удаляем звонок
    this.activeCalls.delete(data.callId)

    // Отмечаем завершение звонка в rate limiter
    this.rateLimiter.onCallEnded(callSession.callerId)
    // Если звонок завершен вызываемым пользователем, также отмечаем
    if (callSession.calleeId === user.userId) {
      this.rateLimiter.onCallEnded(callSession.calleeId)
    }

    // Отправляем подтверждение инициатору hangup
    client.emit(CallEvent.CALL_HANGUP, { callId: data.callId })

    this.logger.debug({
      '[handleHangup]': {
        message: 'Call ended',
        callId: data.callId,
        hangupBy: user.userId,
      },
    })
  }

  /**
   * Обработка WebRTC сигналов для P2P соединения
   * Ретранслирует сигналы (offer/answer/ice-candidate) между участниками звонка
   * Защищено от replay атак через nonce и временные метки
   */
  @SubscribeMessage(CallEvent.WEBRTC_SIGNAL)
  handleWebRTCSignal(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: DTO.WebRTCSignalDtoRequest,
    @WsUser() user: IUserDB,
  ) {
    this.logger.debug({ '[handleWebRTCSignal]': { user: user.userId, callId: data.callId, type: data.type } })

    // Проверка 1: Валидация временной метки (защита от старых сигналов)
    const now = Date.now()
    const signalAge = now - data.timestamp

    if (signalAge > this.SIGNAL_MAX_AGE || signalAge < 0) {
      this.logger.warn({
        '[handleWebRTCSignal]': {
          error: 'Signal timestamp invalid or too old',
          callId: data.callId,
          timestamp: data.timestamp,
          age: signalAge,
          maxAge: this.SIGNAL_MAX_AGE,
        },
      })
      client.emit(CallEvent.CALL_ERROR, { message: 'Signal expired or invalid timestamp' })
      return
    }

    const callSession = this.activeCalls.get(data.callId)
    if (!callSession) {
      client.emit(CallEvent.CALL_ERROR, { message: CallWebSocketGateway.CALL_NOT_FOUND_MESSAGE })
      return
    }

    // Проверяем, что пользователь является участником звонка
    const NOT_AUTHORIZED_MESSAGE = 'Not authorized for this call'
    if (callSession.callerId !== user.userId && callSession.calleeId !== user.userId) {
      client.emit(CallEvent.CALL_ERROR, { message: NOT_AUTHORIZED_MESSAGE })
      return
    }

    // Проверка 2: Защита от replay атак (проверка nonce)
    const usedNonces = this.usedSignalNonces.get(data.callId) || new Set<string>()
    if (usedNonces.has(data.nonce)) {
      this.logger.warn({
        '[handleWebRTCSignal]': {
          error: 'Replay attack detected - duplicate nonce',
          callId: data.callId,
          nonce: data.nonce,
          userId: user.userId,
        },
      })
      client.emit(CallEvent.CALL_ERROR, { message: 'Invalid signal - possible replay attack' })
      return
    }

    // Проверка 3: Валидация соответствия сигнала состоянию звонка
    if (data.type === DTO.WebRTCSignalType.OFFER && callSession.status !== CallStatus.ringing) {
      this.logger.warn({
        '[handleWebRTCSignal]': {
          error: 'Unexpected offer signal for current call state',
          callId: data.callId,
          status: callSession.status,
          expectedStatus: CallStatus.ringing,
        },
      })
      client.emit(CallEvent.CALL_ERROR, { message: 'Invalid signal for current call state' })
      return
    }

    if (data.type === DTO.WebRTCSignalType.ANSWER && callSession.status !== CallStatus.connecting) {
      this.logger.warn({
        '[handleWebRTCSignal]': {
          error: 'Unexpected answer signal for current call state',
          callId: data.callId,
          status: callSession.status,
          expectedStatus: CallStatus.connecting,
        },
      })
      client.emit(CallEvent.CALL_ERROR, { message: 'Invalid signal for current call state' })
      return
    }

    // Проверка 4: Валидация наличия необходимых данных
    if (data.type === DTO.WebRTCSignalType.OFFER && !data.sdp) {
      this.logger.warn({
        '[handleWebRTCSignal]': {
          error: 'Missing SDP in offer signal',
          callId: data.callId,
        },
      })
      client.emit(CallEvent.CALL_ERROR, { message: 'Missing SDP in offer signal' })
      return
    }

    if (data.type === DTO.WebRTCSignalType.ANSWER && !data.sdp) {
      this.logger.warn({
        '[handleWebRTCSignal]': {
          error: 'Missing SDP in answer signal',
          callId: data.callId,
        },
      })
      client.emit(CallEvent.CALL_ERROR, { message: 'Missing SDP in answer signal' })
      return
    }

    if (data.type === DTO.WebRTCSignalType.ICE_CANDIDATE && !data.candidate) {
      this.logger.warn({
        '[handleWebRTCSignal]': {
          error: 'Missing candidate in ICE candidate signal',
          callId: data.callId,
        },
      })
      client.emit(CallEvent.CALL_ERROR, { message: 'Missing candidate in ICE candidate signal' })
      return
    }

    // Регистрируем nonce как использованный
    usedNonces.add(data.nonce)
    this.usedSignalNonces.set(data.callId, usedNonces)

    // Определяем получателя сигнала (другой участник звонка)
    const targetUserId = callSession.callerId === user.userId ? callSession.calleeId : callSession.callerId
    const targetSockets = this.userSockets.get(targetUserId)

    if (targetSockets && targetSockets.size > 0) {
      // Ретранслируем сигнал другому участнику через /call namespace
      // Передаем все данные включая timestamp и nonce для валидации на клиенте
      targetSockets.forEach((socketId) => {
        const socket = this.getSocketById(socketId)
        if (socket) {
          socket.emit(CallEvent.WEBRTC_SIGNAL, {
            callId: data.callId,
            type: data.type,
            sdp: data.sdp,
            candidate: data.candidate,
            timestamp: data.timestamp,
            nonce: data.nonce,
          })
        }
      })
      this.logger.debug({
        '[handleWebRTCSignal]': {
          message: 'Signal sent via /call namespace',
          callId: data.callId,
          targetUserId,
          signalType: data.type,
        },
      })
    } else {
      // Пользователь не подключен к /call namespace
      // WebRTC сигналы требуют активного подключения к /call namespace
      this.logger.warn({
        '[handleWebRTCSignal]': {
          message: 'Target user not connected to /call namespace',
          callId: data.callId,
          targetUserId,
          signalType: data.type,
        },
      })
    }

    this.logger.debug({ '[handleWebRTCSignal]': { callId: data.callId, userId: user.userId, signalType: data.type } })
  }

  /**
   * Устанавливает таймаут для звонка в зависимости от его статуса
   */
  private setupCallTimeout(callId: CallId, callSession: CallSession): void {
    // Очищаем предыдущий таймер, если есть
    this.clearCallTimeout(callId)

    const timeout = this.callTimeouts[callSession.status]

    // Если таймаут не установлен для этого статуса, не создаем таймер
    if (!timeout || timeout <= 0) {
      return
    }

    const timer = setTimeout(() => {
      this.logger.warn({
        '[callTimeout]': {
          callId,
          status: callSession.status,
          callerId: callSession.callerId,
          calleeId: callSession.calleeId,
          createdAt: new Date(callSession.createdAt).toISOString(),
          lastStatusChange: new Date(callSession.lastStatusChange).toISOString(),
          age: Date.now() - callSession.createdAt,
        },
      })

      // Завершаем звонок по таймауту
      this.endCallWithTimeout(callId, callSession)
    }, timeout)

    this.callTimers.set(callId, timer)

    this.logger.debug({
      '[setupCallTimeout]': {
        callId,
        status: callSession.status,
        timeout: `${timeout / 1000}s`,
      },
    })
  }

  /**
   * Очищает таймер для звонка
   */
  private clearCallTimeout(callId: CallId): void {
    const timer = this.callTimers.get(callId)
    if (timer) {
      clearTimeout(timer)
      this.callTimers.delete(callId)
    }
  }

  /**
   * Завершает звонок по таймауту
   */
  private endCallWithTimeout(callId: CallId, callSession: CallSession): void {
    // Уведомляем участников о таймауте
    const participants = [callSession.callerId, callSession.calleeId]

    participants.forEach((userId) => {
      const sockets = this.userSockets.get(userId)
      if (sockets) {
        sockets.forEach((socketId) => {
          const socket = this.getSocketById(socketId)
          if (socket) {
            socket.emit(CallEvent.CALL_ERROR, {
              message: 'Call timeout',
              callId,
            })
            socket.emit(CallEvent.CALL_HANGUP, { callId })
          }
        })
      }
    })

    // Очищаем таймер
    this.clearCallTimeout(callId)

    // Очищаем использованные nonce для этого звонка
    this.cleanupUsedSignalNonces(callId)

    // Отмечаем завершение звонка в rate limiter
    this.rateLimiter.onCallEnded(callSession.callerId)
    if (callSession.calleeId !== callSession.callerId) {
      this.rateLimiter.onCallEnded(callSession.calleeId)
    }

    // Удаляем звонок
    this.activeCalls.delete(callId)

    this.logger.debug({
      '[endCallWithTimeout]': {
        callId,
        status: callSession.status,
        callerId: callSession.callerId,
        calleeId: callSession.calleeId,
      },
    })
  }

  /**
   * Очищает истекшие звонки
   */
  private cleanupExpiredCalls(): void {
    const now = Date.now()
    const expiredCalls: CallId[] = []

    this.activeCalls.forEach((callSession, callId) => {
      const timeout = this.callTimeouts[callSession.status]

      // Проверяем, не истек ли звонок
      if (timeout > 0) {
        const timeSinceStatusChange = now - callSession.lastStatusChange
        if (timeSinceStatusChange > timeout) {
          expiredCalls.push(callId)
        }
      }
    })

    expiredCalls.forEach((callId) => {
      const callSession = this.activeCalls.get(callId)
      if (callSession) {
        this.logger.warn({
          '[cleanupExpiredCalls]': {
            callId,
            status: callSession.status,
            createdAt: new Date(callSession.createdAt).toISOString(),
            lastStatusChange: new Date(callSession.lastStatusChange).toISOString(),
            age: now - callSession.createdAt,
          },
        })
        this.endCallWithTimeout(callId, callSession)
      }
    })

    if (expiredCalls.length > 0) {
      this.logger.debug({
        '[cleanupExpiredCalls]': {
          cleaned: expiredCalls.length,
          totalCalls: this.activeCalls.size,
        },
      })
    }
  }

  /**
   * Очищает использованные nonce для звонка
   */
  private cleanupUsedSignalNonces(callId: CallId): void {
    this.usedSignalNonces.delete(callId)
    this.logger.debug({
      '[cleanupUsedSignalNonces]': {
        callId,
        message: 'Cleaned up used signal nonces',
      },
    })
  }

  /**
   * Завершает все активные звонки для пользователя при отключении
   */
  private endCallsForUser(userId: UserId, socketId: string): void {
    const callsToEnd: CallId[] = []

    this.activeCalls.forEach((call, callId) => {
      if (call.callerId === userId || call.calleeId === userId) {
        callsToEnd.push(callId)

        // Уведомляем другого участника
        const targetUserId = call.callerId === userId ? call.calleeId : call.callerId
        const targetSockets = this.userSockets.get(targetUserId)

        if (targetSockets && targetSockets.size > 0) {
          targetSockets.forEach((targetSocketId) => {
            const socket = this.getSocketById(targetSocketId)
            if (socket) {
              socket.emit(CallEvent.CALL_HANGUP, { callId })
            }
          })
        }
      }
    })

    // Удаляем завершенные звонки и отмечаем в rate limiter
    callsToEnd.forEach((callId) => {
      const call = this.activeCalls.get(callId)
      if (call) {
        // Очищаем таймер
        this.clearCallTimeout(callId)

        // Очищаем использованные nonce для этого звонка
        this.cleanupUsedSignalNonces(callId)

        // Отмечаем завершение звонка в rate limiter
        this.rateLimiter.onCallEnded(call.callerId)
        if (call.calleeId !== call.callerId) {
          this.rateLimiter.onCallEnded(call.calleeId)
        }
      }
      this.activeCalls.delete(callId)
    })

    if (callsToEnd.length > 0) {
      this.logger.debug({ '[endCallsForUser]': { userId, socketId, endedCalls: callsToEnd.length } })
    }
  }
}
