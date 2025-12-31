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
    
    this.logger.debug({
      '[canActivate]': {
        contextType,
        isPublic,
        handler: context.getHandler()?.name,
        className: context.getClass()?.name,
      },
    })

    if (contextType === 'ws') {
      this.logger.debug({ '[canActivate]': { message: 'Calling handleWebSocket for WebSocket context' } })
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

    this.logger.debug({
      '[handleWebSocket]': {
        clientId: client.id,
        namespace: client.nsp.name,
        hasAuth: !!client.handshake.auth,
        authKeys: Object.keys(client.handshake.auth || {}),
      },
    })

    try {
      const token = JwtAuthGuard.extractTokenFromWebSocket(client)

      if (!token) {
        this.logger.warn({
          '[handleWebSocket]': {
            error: 'No token provided',
            clientId: client.id,
            hasAuthHeader: !!client.handshake.headers.authorization,
            hasAuthToken: !!client.handshake.auth?.token,
            authKeys: Object.keys(client.handshake.auth || {}),
          },
        })
        throw new WsException('No token provided')
      }

      const user = await this.validateWebSocketToken(token)

      client.user = user
      client.userId = user.userId

      this.logger.debug({
        '[handleWebSocket]': {
          success: true,
          clientId: client.id,
          userId: user.userId,
        },
      })

      return true
    } catch (error) {
      this.logger.error({
        '[handleWebSocket]': {
          error: error instanceof Error ? error.message : String(error),
          clientId: client.id,
          errorType: error instanceof WsException ? 'WsException' : 'Unknown',
        },
      })
      if (error instanceof WsException) {
        throw error
      }
      throw new WsException('Authentication failed')
    }
  }

  /**
   * Публичный метод для аутентификации WebSocket соединения
   * Можно вызвать из handleConnection для ручной аутентификации
   */
  public static async authenticateWebSocketConnection(
    client: Socket & { user?: IUserDB; userId?: string },
    jwtService: JwtService,
    userService: IUserService,
    configService: ConfigService,
    logger: Logger,
  ): Promise<IUserDB | null> {
    try {
      const token = JwtAuthGuard.extractTokenFromWebSocket(client)

      if (!token) {
        logger.warn({
          '[authenticateWebSocketConnection]': {
            error: 'No token provided',
            clientId: client.id,
            hasAuthHeader: !!client.handshake.headers.authorization,
            hasAuthToken: !!client.handshake.auth?.token,
            authKeys: Object.keys(client.handshake.auth || {}),
          },
        })
        return null
      }

      const secret = configService.get<string>('JWT_AUTH_SECRET')
      if (!secret) {
        logger.error({ '[authenticateWebSocketConnection]': { error: 'JWT_AUTH_SECRET not configured' } })
        return null
      }

      const tokenPayload = jwtService.verify<TokenPayload>(token, { secret })
      const { userId } = tokenPayload.user

      if (!userId) {
        logger.error({ '[authenticateWebSocketConnection]': { error: 'No userId in token payload', tokenPayload } })
        return null
      }

      const readUserResponse = await userService.getUser({ userId })

      if (isErrorServiceResponse(readUserResponse)) {
        logger.error({
          '[authenticateWebSocketConnection]': {
            error: 'User not found',
            userId,
            serviceResponse: readUserResponse,
          },
        })
        return null
      }

      const { user } = readUserResponse.data

      if (!user) {
        logger.error({ '[authenticateWebSocketConnection]': { error: 'User data is null', userId } })
        return null
      }

      logger.debug({
        '[authenticateWebSocketConnection]': {
          success: true,
          clientId: client.id,
          userId: user.userId,
        },
      })

      return user
    } catch (error) {
      logger.error({
        '[authenticateWebSocketConnection]': {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      })
      return null
    }
  }

  private static extractTokenFromWebSocket(client: Socket): string | null {
    // Проверяем токен в заголовке Authorization (Bearer token)
    const authHeader = client.handshake.headers.authorization
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const logger = new Logger(JwtAuthGuard.name)
      logger.debug({
        '[extractTokenFromWebSocket]': {
          clientId: client.id,
          source: 'Authorization header',
          tokenLength: token.length,
        },
      })
      return token
    }

    // Проверяем токен в auth объекте (Socket.IO auth option)
    const authToken = client.handshake.auth?.token
    if (authToken && typeof authToken === 'string') {
      // Если токен уже содержит "Bearer ", убираем его
      let token = authToken
      if (authToken.startsWith('Bearer ')) {
        token = authToken.substring(7)
      }
      const logger = new Logger(JwtAuthGuard.name)
      logger.debug({
        '[extractTokenFromWebSocket]': {
          clientId: client.id,
          source: 'auth.token',
          tokenLength: token.length,
          hadBearerPrefix: authToken.startsWith('Bearer '),
        },
      })
      return token
    }

    // Логируем для отладки, если токен не найден
    const logger = new Logger(JwtAuthGuard.name)
    logger.warn({
      '[extractTokenFromWebSocket]': {
        clientId: client.id,
        hasAuthHeader: !!authHeader,
        authHeaderType: typeof authHeader,
        authHeaderValue: authHeader ? (typeof authHeader === 'string' ? authHeader.substring(0, 20) + '...' : String(authHeader)) : null,
        hasAuthToken: !!authToken,
        authTokenType: typeof authToken,
        authTokenValue: authToken ? (typeof authToken === 'string' ? authToken.substring(0, 20) + '...' : String(authToken)) : null,
        authKeys: Object.keys(client.handshake.auth || {}),
        allAuthValues: client.handshake.auth,
      },
    })

    return null
  }

  private async validateWebSocketToken(token: string) {
    try {
      const secret = this.configService.get<string>('JWT_AUTH_SECRET')
      if (!secret) {
        this.logger.error({ '[validateWebSocketToken]': { error: 'JWT_AUTH_SECRET not configured' } })
        throw new WsException('Server configuration error')
      }

      this.logger.debug({
        '[validateWebSocketToken]': {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20) + '...',
        },
      })

      const tokenPayload = this.jwtService.verify<TokenPayload>(token, { secret })
      this.logger.debug({
        '[validateWebSocketToken]': {
          tokenVerified: true,
          hasUserId: !!tokenPayload?.user?.userId,
          userId: tokenPayload?.user?.userId,
        },
      })

      const { userId } = tokenPayload.user
      if (!userId) {
        this.logger.error({ '[validateWebSocketToken]': { error: 'No userId in token payload', tokenPayload } })
        throw new WsException('Invalid token: missing userId')
      }

      const readUserResponse = await this.userService.getUser({ userId })

      if (isErrorServiceResponse(readUserResponse)) {
        this.logger.error({
          '[validateWebSocketToken]': {
            error: 'User not found',
            userId,
            serviceResponse: readUserResponse,
          },
        })
        throw new WsException('User not found')
      }

      const { user } = readUserResponse.data
      if (!user) {
        this.logger.error({ '[validateWebSocketToken]': { error: 'User data is null', userId } })
        throw new WsException('User data not available')
      }

      this.logger.debug({
        '[validateWebSocketToken]': {
          success: true,
          userId: user.userId,
        },
      })

      return user
    } catch (error) {
      if (error instanceof WsException) {
        throw error
      }
      this.logger.error({
        '[validateWebSocketToken]': {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      })
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
