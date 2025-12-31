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

import { commonError } from '@app/errors'
import { IGetUserRequest, IUpdateUserRequest, IUserDB, IUserService, UserId } from '@app/types/User'
import { JwtAuthGuard, WsUser } from '../../auth/utils'
import { getCorsOrigin } from '../../utils/cors.utils'

@WebSocketGateway({
  namespace: '/user',
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class UserWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private logger = new Logger(UserWebSocketGateway.name)

  @Inject(IUserService)
  private readonly userService: IUserService

  handleConnection(client: Socket & { user?: IUserDB }) {
    this.logger.debug({ '[handleConnection]': { clientId: client.id, userId: client.user?.userId } })
  }

  handleDisconnect(client: Socket & { user?: IUserDB }) {
    this.logger.debug({ '[handleDisconnect]': { clientId: client.id, userId: client.user?.userId } })
  }

  @SubscribeMessage('getUser')
  async handleGetUser(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { userId?: UserId },
    @WsUser() user: IUserDB,
  ) {
    const userId = data?.userId || user.userId

    if (userId !== user.userId) {
      this.logger.warn({ '[handleGetUser]': { error: 'Access denied', userId, requestorId: user.userId } })
      client.emit('error', { message: commonError.DONT_ACCESS })
      return
    }

    const requestData: IGetUserRequest = { userId }
    this.logger.debug({ '[handleGetUser]': { requestData } })

    try {
      const response = await this.userService.getUser(requestData)
      this.logger.debug({ '[handleGetUser]': { response } })
      client.emit('getUser:response', response)
    } catch (error) {
      this.logger.error({ '[handleGetUser]': { error: error as Error } })
      client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
    }
  }

  @SubscribeMessage('updateUser')
  async handleUpdateUser(
    @ConnectedSocket() client: Socket & { user?: IUserDB },
    @MessageBody() data: { userId?: UserId; [key: string]: unknown },
    @WsUser() user: IUserDB,
  ) {
    const userId = data?.userId || user.userId

    if (userId !== user.userId) {
      this.logger.warn({ '[handleUpdateUser]': { error: 'Access denied', userId, requestorId: user.userId } })
      client.emit('error', { message: commonError.DONT_ACCESS })
      return
    }

    const { userId: _, ...updateData } = data

    const requestData: IUpdateUserRequest = { ...updateData, userId } as IUpdateUserRequest
    this.logger.debug({ '[handleUpdateUser]': { requestData } })

    try {
      const response = await this.userService.updateUser(requestData)
      this.logger.debug({ '[handleUpdateUser]': { response } })
      client.emit('updateUser:response', response)
    } catch (error) {
      this.logger.error({ '[handleUpdateUser]': { error: error as Error } })
      client.emit('error', { message: commonError.INTERNAL_SERVER_ERROR })
    }
  }
}
