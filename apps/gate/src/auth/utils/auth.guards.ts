// Reason: need to store all guards' classes logic in one place
// eslint-disable-next-line max-classes-per-file
import { ExecutionContext, Inject, Injectable, Logger, SetMetadata, UnauthorizedException } from '@nestjs/common'
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
  private readonly logger = new Logger(JwtAuthGuard.name)

  constructor(
    private reflector: Reflector,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(IUserService) private readonly userService: IUserService,
  ) {
    super()
  }

  // Переопределяем handleRequest для логирования ошибок от Passport
  handleRequest(err: unknown, user: unknown, info: unknown, context: ExecutionContext) {
    if (err) {
      this.logger.error({ '[handleRequest] ERROR': { error: err } })
    }

    // Обрабатываем информацию об ошибке токена
    if (info) {
      const errorInfo = info as { name?: string; message?: string; expiredAt?: Date | string }

      this.logger.error({ '[handleRequest] INFO': { info } })

      // Если токен истек, выбрасываем более понятную ошибку
      if (errorInfo?.name === 'TokenExpiredError') {
        const expiredAt = errorInfo.expiredAt ? new Date(errorInfo.expiredAt).toISOString() : 'unknown'

        // Выбрасываем UnauthorizedException с понятным сообщением
        throw new UnauthorizedException({
          message: 'JWT token has expired',
          error: ['Токен авторизации истек. Пожалуйста, войдите в систему снова.'],
          expiredAt,
        })
      }
    }

    // Вызываем родительский метод, который выбросит ошибку если есть
    return super.handleRequest(err, user, info, context)
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

    // Для HTTP запросов проверяем наличие заголовка Authorization
    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest()
      const authHeader = request.headers?.authorization

      if (!authHeader) {
        this.logger.error({
          '[canActivate] ERROR': {
            error: 'No Authorization header found',
            url: request.url,
            method: request.method,
          },
        })
      } else if (!authHeader.startsWith('Bearer ')) {
        this.logger.error({
          '[canActivate] ERROR': {
            error: 'Invalid Authorization header format',
            url: request.url,
          },
        })
      }
    }

    // Note: also set "request.user" field
    const result = super.canActivate(context)

    // Логируем только ошибки
    if (result instanceof Promise) {
      return result.then(
        (success) => {
          return success
        },
        (error) => {
          this.logger.error({ '[super.canActivate] ERROR': { error } })
          throw error
        },
      )
    }

    return result
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
    // Проверяем токен в заголовке Authorization (Bearer token)
    const authHeader = client.handshake.headers.authorization
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    // Проверяем токен в auth объекте (Socket.IO auth option)
    const authToken = client.handshake.auth?.token
    if (authToken && typeof authToken === 'string') {
      // Если токен уже содержит "Bearer ", убираем его
      if (authToken.startsWith('Bearer ')) {
        return authToken.substring(7)
      }
      return authToken
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
