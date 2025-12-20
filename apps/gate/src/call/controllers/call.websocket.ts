import { Inject, Logger, UseGuards } from '@nestjs/common'
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
import { commonError } from '@app/errors'
import { CallId, CallStatus, IInitiateCallResponse, IVpnConnectionConfig } from '@app/types/Call'
import { IUserDB, IUserService, UserId } from '@app/types/User'
import { isErrorServiceResponse } from '@app/utils/service'
import { JwtAuthGuard, WsUser } from '../../auth/utils'
import { VpnConfigService } from '../services/vpn-config.service'
import * as DTO from '../dto'

interface CallSession {
  callId: CallId
  callerId: UserId
  calleeId: UserId
  status: CallStatus
  callerSocketId?: string
  calleeSocketId?: string
  callerVpnConfig?: IVpnConnectionConfig
  calleeVpnConfig?: IVpnConnectionConfig
}

@WebSocketGateway({
  namespace: '/call',
  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class CallWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private logger = new Logger(CallWebSocketGateway.name)

  // Хранилище активных звонков
  private activeCalls = new Map<CallId, CallSession>()

  // Маппинг userId -> Set<socketId> для быстрого поиска сокетов пользователя
  private userSockets = new Map<UserId, Set<string>>()

  // Маппинг socketId -> userId
  private socketUsers = new Map<string, UserId>()

  @Inject(IUserService)
  private readonly userService: IUserService

  @Inject(VpnConfigService)
  private readonly vpnConfigService: VpnConfigService

  private static readonly CALL_NOT_FOUND_MESSAGE = 'Call not found'

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
    this.logger.debug({ '[handleInitiateCall]': { user: user.userId, data } })

    const { calleeId } = data
    const callerId = user.userId

    // Проверяем, что пользователь не звонит сам себе
    if (callerId === calleeId) {
      client.emit(CallEvent.CALL_ERROR, { message: 'Cannot call yourself' })
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

    // Проверяем, что вызываемый пользователь онлайн
    const calleeSockets = this.userSockets.get(calleeId)
    if (!calleeSockets || calleeSockets.size === 0) {
      this.logger.warn({ '[handleInitiateCall]': { error: 'User is offline', calleeId } })
      client.emit(CallEvent.CALL_ERROR, { message: 'User is offline' })
      return
    }

    // Создаем новый звонок
    const callId = uuidv4()
    const callSession: CallSession = {
      callId,
      callerId,
      calleeId,
      status: CallStatus.initiating,
      callerSocketId: client.id,
    }

    this.activeCalls.set(callId, callSession)

    const response: IInitiateCallResponse = {
      callId,
      callerId,
      calleeId,
    }

    // Отправляем ответ инициатору
    client.emit(CallEvent.CALL_INITIATED, response)

    // Отправляем уведомление вызываемому пользователю на все его сокеты
    const incomingCallData = {
      callId,
      callerId,
      calleeId,
    }

    let calleeSocketFound = false
    calleeSockets.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId)
      if (socket) {
        socket.emit(CallEvent.INCOMING_CALL, incomingCallData)
        if (!calleeSocketFound) {
          callSession.calleeSocketId = socketId
          calleeSocketFound = true
        }
      }
    })

    // Обновляем статус звонка
    callSession.status = CallStatus.ringing

    this.logger.debug({ '[handleInitiateCall]': { callId, response } })
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
        const socket = this.server.sockets.sockets.get(socketId)
        if (socket) {
          socket.emit(CallEvent.CALL_ACCEPTED, { callId: data.callId })
          socket.emit(CallEvent.VPN_CONFIG_RECEIVED, callerVpnConfig)
        }
      })
    }

    callSession.status = CallStatus.connecting

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
        const socket = this.server.sockets.sockets.get(socketId)
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
        const socket = this.server.sockets.sockets.get(socketId)
        if (socket) {
          socket.emit(CallEvent.CALL_REJECTED, { callId: data.callId })
        }
      })
    }

    callSession.status = CallStatus.rejected
    this.activeCalls.delete(data.callId)

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
        const socket = this.server.sockets.sockets.get(socketId)
        if (socket) {
          socket.emit(CallEvent.CALL_HANGUP, { callId: data.callId })
        }
      })
    }

    callSession.status = CallStatus.ended
    this.activeCalls.delete(data.callId)

    client.emit(CallEvent.CALL_HANGUP, { callId: data.callId })
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
            const socket = this.server.sockets.sockets.get(targetSocketId)
            if (socket) {
              socket.emit(CallEvent.CALL_HANGUP, { callId })
            }
          })
        }
      }
    })

    // Удаляем завершенные звонки
    callsToEnd.forEach((callId) => {
      this.activeCalls.delete(callId)
    })

    if (callsToEnd.length > 0) {
      this.logger.debug({ '[endCallsForUser]': { userId, socketId, endedCalls: callsToEnd.length } })
    }
  }
}

