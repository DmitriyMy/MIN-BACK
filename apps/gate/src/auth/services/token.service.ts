import { HttpException, Inject, Injectable, Logger } from '@nestjs/common'

import { JwtService } from '@nestjs/jwt'
import { pick } from 'lodash'
import { IAuthService, ISignInUserRequest, TokenPayload } from '@app/types/Auth'
import { IUserDB } from '@app/types/User'
import { isErrorServiceResponse } from '@app/utils/service'

@Injectable()
export class TokenService {
  private logger = new Logger(TokenService.name)

  @Inject(JwtService)
  private readonly jwtService: JwtService

  @Inject(IAuthService)
  private readonly authService: IAuthService

  public async validateUser(params: ISignInUserRequest) {
    // ИСПРАВЛЕНИЕ: Не логируем params, так как он содержит пароль
    this.logger.debug({ '[validate]': { email: params.email } })

    const validateUserResponse = await this.authService.signInUser(params)

    // ИСПРАВЛЕНИЕ: Не логируем полный ответ, так как он может содержать чувствительные данные
    this.logger.debug({ '[validate]': { status: validateUserResponse.status } })

    if (isErrorServiceResponse(validateUserResponse)) {
      const { status, error } = validateUserResponse
      throw new HttpException(error.join(', '), status)
    }

    const { user } = validateUserResponse.data

    return user
  }

  public getToken(user: IUserDB): string {
    const tokenPayload: TokenPayload = {
      user: pick(user, ['userId', 'name', 'avatar']),
    }

    const token = this.jwtService.sign(tokenPayload)

    // ИСПРАВЛЕНИЕ: Не логируем токен, так как это чувствительные данные
    this.logger.debug({ '[getToken]': { userId: user.userId, tokenLength: token.length } })

    return token
  }
}
