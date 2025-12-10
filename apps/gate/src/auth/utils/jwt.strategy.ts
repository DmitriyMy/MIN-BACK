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
    this.logger.debug({ '[validate]': { tokenPayload } })

    const { userId } = tokenPayload.user

    const readUserResponse = await this.userService.getUser({ userId })

    this.logger.debug({ '[validate]': { readUserResponse } })

    if (isErrorServiceResponse(readUserResponse)) {
      const { status, error } = readUserResponse
      throw new HttpException(error.join(', '), status)
    }

    const { user } = readUserResponse.data

    return user
  }
}
