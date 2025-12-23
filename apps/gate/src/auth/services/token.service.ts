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
    this.logger.debug({ '[validate]': { params } })

    const validateUserResponse = await this.authService.signInUser(params)

    this.logger.debug({ '[validate]': { validateUserResponse } })

    if (isErrorServiceResponse(validateUserResponse)) {
      const { status, error } = validateUserResponse
      throw new HttpException(error.join(', '), status)
    }

    const { user } = validateUserResponse.data

    return user
  }

  public getToken(user: IUserDB): string {
    const tokenPayload: TokenPayload = {
      user: pick(user, ['userId', 'name']),
    }

    const token = this.jwtService.sign(tokenPayload)

    this.logger.debug({ '[getToken]': { token } })

    return token
  }
}
