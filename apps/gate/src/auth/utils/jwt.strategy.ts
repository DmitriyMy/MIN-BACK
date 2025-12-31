import { HttpException, Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { AuthStrategy } from '@app/constants/auth'
import { TokenPayload } from '@app/types/Auth'
import { IUserService } from '@app/types/User'
import { isErrorServiceResponse } from '@app/utils/service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, AuthStrategy.jwt) {
  private logger = new Logger('JwtStrategy')

  @Inject(IUserService)
  private readonly userService: IUserService

  constructor(private readonly configService: ConfigService) {
    super({
      secretOrKey: configService.get<string>('JWT_AUTH_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    })
  }

  public async validate(tokenPayload: TokenPayload) {
    try {
      const { userId } = tokenPayload.user

      if (!userId) {
        // ИСПРАВЛЕНИЕ: Не логируем tokenPayload, так как это чувствительные данные
        this.logger.error({ '[validate] ERROR': { error: 'No userId in token payload' } })
        throw new HttpException('Invalid token: missing userId', 401)
      }

      const readUserResponse = await this.userService.getUser({ userId })

      if (isErrorServiceResponse(readUserResponse)) {
        const { status, error } = readUserResponse
        this.logger.error({ '[validate]': { message: 'User service error', status, serviceError: error } })
        throw new HttpException(error.join(', '), status)
      }

      const { user } = readUserResponse.data

      if (!user) {
        this.logger.error({ '[validate]': { error: 'User not found in response', readUserResponse } })
        throw new HttpException('User not found', 404)
      }

      return user
    } catch (err) {
      // ИСПРАВЛЕНИЕ: Не логируем tokenPayload, так как это чувствительные данные
      this.logger.error({ '[validate]': { error: err instanceof Error ? err.message : String(err) } })
      if (err instanceof HttpException) {
        throw err
      }
      throw new HttpException('Authentication failed', 401)
    }
  }
}
