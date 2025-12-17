// Reason: need to store all guards' classes logic in one place
// eslint-disable-next-line max-classes-per-file
import { ExecutionContext, Inject, Injectable, SetMetadata } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { AuthGuard } from '@nestjs/passport'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { AuthStrategy } from '@app/constants/auth'
import { TokenPayload } from '@app/types/Auth'
import { IUserDB, IUserService } from '@app/types/User'
import { isErrorServiceResponse } from '@app/utils/service'

export const IS_PUBLIC_KEY = 'isPublic'

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

@Injectable()
export class JwtAuthGuard extends AuthGuard(AuthStrategy.jwt) {
  constructor(
    private reflector: Reflector,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(IUserService) private readonly userService: IUserService,
  ) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const contextType = context.getType()

    if (contextType === 'ws') {
      return this.handleWebSocket(context)
    }

    // Note: also set "request.user" field
    return super.canActivate(context)
  }

  private async handleWebSocket(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket & { user?: IUserDB; userId?: string }>()

    try {
      const token = JwtAuthGuard.extractTokenFromWebSocket(client)

      if (!token) {
        throw new WsException('No token provided')
      }

      const user = await this.validateWebSocketToken(token)

      client.user = user
      client.userId = user.userId

      return true
    } catch (error) {
      if (error instanceof WsException) {
        throw error
      }
      throw new WsException('Authentication failed')
    }
  }

  private static extractTokenFromWebSocket(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    return null
  }

  private async validateWebSocketToken(token: string) {
    try {
      const secret = this.configService.get<string>('JWT_AUTH_SECRET')
      const tokenPayload = this.jwtService.verify<TokenPayload>(token, { secret })

      const { userId } = tokenPayload.user
      const readUserResponse = await this.userService.getUser({ userId })

      if (isErrorServiceResponse(readUserResponse)) {
        throw new WsException('User not found')
      }

      const { user } = readUserResponse.data
      return user
    } catch (error) {
      if (error instanceof WsException) {
        throw error
      }
      throw new WsException('Invalid token')
    }
  }
}

@Injectable()
export class EmailAuthGuard extends AuthGuard(AuthStrategy.email) {}

@Injectable()
export class PhoneAuthGuard extends AuthGuard(AuthStrategy.phone) {}

@Injectable()
export class EmailOrPhoneAuthGuard extends AuthGuard([AuthStrategy.phone, AuthStrategy.email]) {}
